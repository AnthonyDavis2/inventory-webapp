import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface PdfFromHtmlOptions {
  html: string
  landscape?: boolean
  marginTop?: string
  marginBottom?: string
  marginLeft?: string
  marginRight?: string
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name)
  private readonly gotenbergUrl: string

  constructor(private readonly config: ConfigService) {
    this.gotenbergUrl = config.getOrThrow('GOTENBERG_URL')
  }

  async fromHtml(options: PdfFromHtmlOptions): Promise<Buffer> {
    const form = new FormData()
    const blob = new Blob([options.html], { type: 'text/html' })
    form.append('files', blob, 'index.html')

    if (options.landscape) {
      form.append('landscape', 'true')
    }
    form.append('marginTop', options.marginTop ?? '0.5in')
    form.append('marginBottom', options.marginBottom ?? '0.5in')
    form.append('marginLeft', options.marginLeft ?? '0.5in')
    form.append('marginRight', options.marginRight ?? '0.5in')

    try {
      const response = await fetch(`${this.gotenbergUrl}/forms/chromium/convert/html`, {
        method: 'POST',
        body: form,
      })

      if (!response.ok) {
        const text = await response.text()
        this.logger.error(`Gotenberg error: ${response.status} ${text}`)
        throw new InternalServerErrorException('PDF generation failed')
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      if (err instanceof InternalServerErrorException) throw err
      this.logger.error('Gotenberg request failed', err)
      throw new InternalServerErrorException('PDF service unavailable')
    }
  }
}
