import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Req,
  RawBody,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import type { Request } from 'express'
import { BillingService } from './billing.service'
import { CreateCheckoutDto } from './dto/create-checkout.dto'
import { Public } from '../../core/auth/decorators/public.decorator'
import { Roles } from '../../core/auth/decorators/roles.decorator'
import { RolesGuard } from '../../core/auth/guards/roles.guard'
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator'
import type { JwtPayload } from '../../core/auth/strategies/jwt.strategy'

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @ApiOperation({ summary: 'Get current subscription details' })
  getSubscription(@CurrentUser() user: JwtPayload) {
    return this.billingService.getSubscription(user.orgId)
  }

  @Post('checkout')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a Stripe Checkout session to subscribe or change plan' })
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(user.orgId, dto)
  }

  @Post('portal')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Create a Stripe Customer Portal session' })
  createPortal(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    const returnUrl = req.headers.referer ?? `${process.env.APP_URL}/settings/billing`
    return this.billingService.createPortalSession(user.orgId, returnUrl)
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint — do not call directly' })
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billingService.handleWebhook(rawBody, signature)
    return { received: true }
  }
}
