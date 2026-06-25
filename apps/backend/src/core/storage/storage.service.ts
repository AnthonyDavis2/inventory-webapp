import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow('R2_BUCKET_NAME')
    this.publicUrl = config.getOrThrow('R2_PUBLIC_URL')

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.getOrThrow('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    })
  }

  async upload(
    buffer: Buffer,
    options: {
      orgId: string
      prefix: string
      filename: string
      contentType: string
    },
  ): Promise<{ key: string; url: string }> {
    const ext = options.filename.split('.').pop()
    const key = `${options.orgId}/${options.prefix}/${randomUUID()}.${ext}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
        Metadata: { orgId: options.orgId, originalName: options.filename },
      }),
    )

    return { key, url: `${this.publicUrl}/${key}` }
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    )
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    )
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  buildKey(orgId: string, prefix: string, filename: string): string {
    return `${orgId}/${prefix}/${filename}`
  }
}
