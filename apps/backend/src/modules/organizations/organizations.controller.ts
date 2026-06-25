import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { OrganizationsService } from './organizations.service'
import { RegisterDto } from './dto/register.dto'
import { UpdateOrgDto } from './dto/update-org.dto'
import { OnboardingStepDto } from './dto/onboarding-step.dto'
import { Public } from '../../core/auth/decorators/public.decorator'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

const REFRESH_COOKIE = 'refresh_token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
}

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Register a new organization and owner account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, orgId, userId } = await this.orgsService.register(
      dto,
      req.ip,
      req.headers['user-agent'],
    )
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)
    res.status(HttpStatus.CREATED)
    return { accessToken, orgId, userId }
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current organization' })
  async getOrg(@CurrentUser() user: JwtPayload) {
    return this.orgsService.getOrg(user.orgId)
  }

  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update organization settings' })
  async updateOrg(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOrgDto) {
    return this.orgsService.updateOrg(user.orgId, dto)
  }

  @Patch('me/onboarding')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete an onboarding step (1–7)' })
  async advanceOnboarding(@CurrentUser() user: JwtPayload, @Body() dto: OnboardingStepDto) {
    return this.orgsService.advanceOnboarding(user.orgId, dto)
  }
}
