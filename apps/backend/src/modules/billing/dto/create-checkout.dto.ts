import { IsIn, IsUrl } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['STARTER', 'GROWTH', 'BUSINESS'] })
  @IsIn(['STARTER', 'GROWTH', 'BUSINESS'])
  plan!: string

  @ApiProperty({ description: 'URL to redirect after successful payment' })
  @IsUrl()
  successUrl!: string

  @ApiProperty({ description: 'URL to redirect if user cancels checkout' })
  @IsUrl()
  cancelUrl!: string
}
