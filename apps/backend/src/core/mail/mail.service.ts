import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly client: Resend
  private readonly from: string

  constructor(private readonly config: ConfigService) {
    this.client = new Resend(config.getOrThrow('RESEND_API_KEY'))
    const name = config.get('RESEND_FROM_NAME', 'Business Ops Platform')
    const email = config.getOrThrow('RESEND_FROM_EMAIL')
    this.from = `${name} <${email}>`
  }

  async send(options: SendEmailOptions): Promise<string | null> {
    try {
      const { data, error } = await this.client.emails.send({
        from: this.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      })
      if (error) {
        this.logger.error(`Failed to send email: ${JSON.stringify(error)}`)
        return null
      }
      return data?.id ?? null
    } catch (err) {
      this.logger.error('Email send exception', err)
      return null
    }
  }

  // Transactional email templates

  async sendInvitation(opts: { to: string; name: string; orgName: string; inviteUrl: string }) {
    return this.send({
      to: opts.to,
      subject: `You've been invited to ${opts.orgName}`,
      html: `
        <p>Hi ${opts.name},</p>
        <p>You've been invited to join <strong>${opts.orgName}</strong> on Business Ops Platform.</p>
        <p><a href="${opts.inviteUrl}">Accept Invitation</a></p>
        <p>This link expires in 48 hours.</p>
      `,
    })
  }

  async sendPasswordReset(opts: { to: string; name: string; resetUrl: string }) {
    return this.send({
      to: opts.to,
      subject: 'Reset your password',
      html: `
        <p>Hi ${opts.name},</p>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${opts.resetUrl}">Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    })
  }

  async sendWelcome(opts: { to: string; name: string; orgName: string }) {
    return this.send({
      to: opts.to,
      subject: `Welcome to ${opts.orgName}`,
      html: `
        <p>Hi ${opts.name},</p>
        <p>Your account for <strong>${opts.orgName}</strong> is ready.</p>
        <p>Log in to get started.</p>
      `,
    })
  }
}
