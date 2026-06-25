import * as Joi from 'joi'

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').required(),
  PORT: Joi.number().default(3001),
  APP_URL: Joi.string().uri().required(),
  API_URL: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().required(),

  // Redis — one of these must be set
  REDIS_URL: Joi.string().optional(),
  UPSTASH_REDIS_REST_URL: Joi.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().optional(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('30d'),

  STRIPE_SECRET_KEY: Joi.string().required(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().required(),
  STRIPE_STARTER_PRICE_ID: Joi.string().required(),
  STRIPE_GROWTH_PRICE_ID: Joi.string().required(),
  STRIPE_BUSINESS_PRICE_ID: Joi.string().required(),

  RESEND_API_KEY: Joi.string().required(),
  RESEND_FROM_EMAIL: Joi.string().email().required(),
  RESEND_FROM_NAME: Joi.string().default('Business Ops Platform'),

  R2_ACCOUNT_ID: Joi.string().required(),
  R2_ACCESS_KEY_ID: Joi.string().required(),
  R2_SECRET_ACCESS_KEY: Joi.string().required(),
  R2_BUCKET_NAME: Joi.string().required(),
  R2_PUBLIC_URL: Joi.string().uri().required(),

  GOTENBERG_URL: Joi.string().uri().required(),

  SENTRY_DSN: Joi.string().optional().allow(''),
  SENTRY_ENVIRONMENT: Joi.string().default('development'),
})
