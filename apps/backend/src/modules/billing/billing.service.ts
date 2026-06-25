import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import { PrismaService } from '../../core/database/prisma.service'
import { TRIAL_DAYS } from './billing.constants'
import type { CreateCheckoutDto } from './dto/create-checkout.dto'

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)
  private readonly stripe: Stripe | null
  private readonly priceIds: Record<string, string>

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY', '')
    const stripeEnabled = stripeKey.startsWith('sk_test_') || stripeKey.startsWith('sk_live_')
    this.stripe = stripeEnabled ? new Stripe(stripeKey, { apiVersion: '2024-06-20' }) : null
    if (!stripeEnabled) this.logger.warn('Stripe not configured — billing features disabled (dev mode)')

    this.priceIds = {
      STARTER: config.get('STRIPE_STARTER_PRICE_ID', 'price_dev'),
      GROWTH: config.get('STRIPE_GROWTH_PRICE_ID', 'price_dev'),
      BUSINESS: config.get('STRIPE_BUSINESS_PRICE_ID', 'price_dev'),
    }
  }

  async onRegister(orgId: string, email: string, orgName: string): Promise<void> {
    if (!this.stripe) {
      // Dev mode: seed a local trial subscription without Stripe
      const trialEnd = new Date(Date.now() + TRIAL_DAYS * 86_400_000)
      await this.prisma.subscription.create({
        data: {
          org_id: orgId,
          stripe_customer_id: `dev_${orgId}`,
          stripe_subscription_id: `dev_sub_${orgId}`,
          plan: 'STARTER',
          status: 'TRIALING',
          trial_ends_at: trialEnd,
          current_period_start: new Date(),
          current_period_end: trialEnd,
        },
      })
      return
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name: orgName,
        metadata: { orgId },
      })

      const trialEnd = Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86_400

      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: this.priceIds.STARTER }],
        trial_end: trialEnd,
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice'],
      })

      await this.prisma.subscription.create({
        data: {
          org_id: orgId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          plan: 'STARTER',
          status: 'TRIALING',
          trial_ends_at: new Date(trialEnd * 1000),
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
        },
      })
    } catch (err) {
      // Non-fatal: org is created, billing can be retried. Log and continue.
      this.logger.error(`Failed to create Stripe subscription for org ${orgId}`, err)
    }
  }

  async getSubscription(orgId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { org_id: orgId } })
    if (!sub) throw new NotFoundException('No subscription found')
    return sub
  }

  async createCheckoutSession(orgId: string, dto: CreateCheckoutDto): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured in this environment')
    const sub = await this.prisma.subscription.findUnique({ where: { org_id: orgId } })
    if (!sub) throw new NotFoundException('No subscription found')

    const priceId = this.priceIds[dto.plan]
    if (!priceId) throw new BadRequestException('Invalid plan')

    const session = await this.stripe.checkout.sessions.create({
      customer: sub.stripe_customer_id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: dto.successUrl,
      cancel_url: dto.cancelUrl,
      subscription_data: {
        metadata: { orgId },
      },
      metadata: { orgId },
    })

    if (!session.url) throw new InternalServerErrorException('Stripe did not return a checkout URL')
    return { url: session.url }
  }

  async createPortalSession(orgId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured in this environment')
    const sub = await this.prisma.subscription.findUnique({ where: { org_id: orgId } })
    if (!sub) throw new NotFoundException('No subscription found')

    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: returnUrl,
    })

    return { url: session.url }
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) throw new BadRequestException('Stripe is not configured in this environment')
    const webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET')
    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`)
      throw new BadRequestException('Invalid webhook signature')
    }

    this.logger.log(`Processing Stripe event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        // Unhandled events are not errors
        break
    }
  }

  private async syncSubscription(stripeSub: Stripe.Subscription): Promise<void> {
    const orgId = stripeSub.metadata?.orgId
    if (!orgId) {
      this.logger.warn(`Subscription ${stripeSub.id} has no orgId metadata — skipping`)
      return
    }

    const plan = this.mapPriceToPlan(stripeSub.items.data[0]?.price.id)
    const status = this.mapStripeStatus(stripeSub.status)

    await this.prisma.subscription.upsert({
      where: { org_id: orgId },
      update: {
        stripe_subscription_id: stripeSub.id,
        plan,
        status,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        current_period_start: new Date(stripeSub.current_period_start * 1000),
        current_period_end: new Date(stripeSub.current_period_end * 1000),
        cancel_at_period_end: stripeSub.cancel_at_period_end,
        cancelled_at: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      },
      create: {
        org_id: orgId,
        stripe_customer_id:
          typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
        stripe_subscription_id: stripeSub.id,
        plan,
        status,
        trial_ends_at: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
        current_period_start: new Date(stripeSub.current_period_start * 1000),
        current_period_end: new Date(stripeSub.current_period_end * 1000),
        cancel_at_period_end: stripeSub.cancel_at_period_end,
      },
    })

    // Unlock org if subscription is now active or trialing
    if (status === 'ACTIVE' || status === 'TRIALING') {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { is_read_only: false },
      })
    }
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
    const orgId = stripeSub.metadata?.orgId
    if (!orgId) return

    await this.prisma.$transaction([
      this.prisma.subscription.updateMany({
        where: { org_id: orgId },
        data: { status: 'CANCELLED', cancelled_at: new Date() },
      }),
      this.prisma.organization.update({
        where: { id: orgId },
        data: { is_read_only: true },
      }),
    ])

    this.logger.log(`Org ${orgId} subscription cancelled — set to read-only`)
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    if (!subId) return

    const sub = await this.prisma.subscription.findFirst({
      where: { stripe_subscription_id: subId },
    })
    if (!sub) return

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.organization.update({
        where: { id: sub.org_id },
        data: { is_read_only: false },
      }),
    ])
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
    if (!subId) return

    const sub = await this.prisma.subscription.findFirst({
      where: { stripe_subscription_id: subId },
    })
    if (!sub) return

    // Stripe handles retries (Day 1, 3, 7). After all retries fail, subscription
    // is deleted and we receive customer.subscription.deleted. Here we mark PAST_DUE
    // but don't immediately lock — give the dunning period to resolve.
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    })

    this.logger.warn(`Payment failed for org ${sub.org_id} — status set to PAST_DUE`)
  }

  private mapPriceToPlan(priceId: string | undefined): SubscriptionPlan {
    if (!priceId) return 'STARTER'
    const entry = Object.entries(this.priceIds).find(([, pid]) => pid === priceId)
    return (entry?.[0] ?? 'STARTER') as SubscriptionPlan
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const map: Partial<Record<Stripe.Subscription.Status, SubscriptionStatus>> = {
      trialing: 'TRIALING',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      paused: 'PAUSED',
      canceled: 'CANCELLED',
      unpaid: 'PAST_DUE',
      incomplete_expired: 'CANCELLED',
    }
    return map[status] ?? 'PAST_DUE'
  }
}
