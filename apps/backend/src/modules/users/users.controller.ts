import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { InviteUserDto } from './dto/invite-user.dto'
import { AcceptInviteDto } from './dto/accept-invite.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { Public } from '../../core/auth/decorators/public.decorator'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in the organization' })
  listUsers(@CurrentUser() user: JwtPayload) {
    return this.usersService.listUsers(user.orgId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  getUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.getUser(user.orgId, id)
  }

  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  inviteUser(@CurrentUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(user.orgId, user.sub, dto)
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation and set password' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto)
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update user name or role' })
  updateUser(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(user.orgId, user.role, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a user (revokes all sessions)' })
  deactivateUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.deactivateUser(user.orgId, user.sub, id)
  }

  @Patch(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Reactivate a deactivated user' })
  reactivateUser(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.reactivateUser(user.orgId, id)
  }
}
