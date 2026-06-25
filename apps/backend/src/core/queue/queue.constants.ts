export const QUEUE_NAMES = {
  EMAIL: 'email',
  PDF: 'pdf',
  NOTIFICATIONS: 'notifications',
  IMPORTS: 'imports',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]
