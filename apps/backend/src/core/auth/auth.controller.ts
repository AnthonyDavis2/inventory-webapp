import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { VerifyMfaDto } from './dto/setup-mfa.dto'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import type { JwtPayload } from './strategies/jwt.strategy'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email + password (+ TOTP if MFA enabled)' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    )
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)
    return { accessToken }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE]
    if (!rawToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' })
    }
    const { accessToken, refreshToken } = await this.authService.refresh(
      rawToken,
      req.ip,
      req.headers['user-agent'],
    )
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)
    return { accessToken }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = req.cookies?.[REFRESH_COOKIE]
    if (rawToken) {
      await this.authService.logout(rawToken)
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions for this user' })
  async logoutAll(@CurrentUser() user: JwtPayload) {
    await this.authService.logoutAll(user.sub)
  }

  @Get('me')
  @ApiBearerAuth()
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub)
  }

  @Post('mfa/setup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate TOTP secret and QR code URL' })
  async setupMfa(@CurrentUser() user: JwtPayload) {
    return this.authService.setupMfa(user.sub)
  }

  @Post('mfa/verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm TOTP code to enable MFA; returns one-time backup codes' })
  async verifyMfa(@CurrentUser() user: JwtPayload, @Body() dto: VerifyMfaDto) {
    const backupCodes = await this.authService.verifyAndEnableMfa(user.sub, dto.totp)
    return { backupCodes }
  }

  @Delete('mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable MFA (requires current TOTP code)' })
  async disableMfa(@CurrentUser() user: JwtPayload, @Body() dto: VerifyMfaDto) {
    await this.authService.disableMfa(user.sub, dto.totp)
  }
}
