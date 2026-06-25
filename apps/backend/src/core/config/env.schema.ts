import * as Joi from 'joi'

const devOrRequired = (defaultVal: string) =>
  Joi.when('NODE_ENV', {
    is: 'development',
    then: Joi.string().default(defaultVal),
    otherwise: Joi.string().required(),
  })

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

  // Stripe — required in staging/production; auto-defaulted in development
  STRIPE_SECRET_KEY: devOrRequired('sk_dev_placeholder'),
  STRIPE_PUBLISHABLE_KEY: devOrRequired('pk_dev_placeholder'),
  STRIPE_WEBHOOK_SECRET: devOrRequired('whsec_dev_placeholder'),
  STRIPE_STARTER_PRICE_ID: devOrRequired('price_dev_starter'),
  STRIPE_GROWTH_PRICE_ID: devOrRequired('price_dev_growth'),
  STRIPE_BUSINESS_PRICE_ID: devOrRequired('price_dev_business'),

  // Email — required in staging/production; auto-defaulted in development
  RESEND_API_KEY: devOrRequired('re_dev_placeholder'),
  RESEND_FROM_EMAIL: Joi.string().email().default('noreply@localhost'),
  RESEND_FROM_NAME: Joi.string().default('Business Ops Platform'),

  // Storage — required in staging/production; auto-defaulted in development
  R2_ACCOUNT_ID: devOrRequired('dev_placeholder'),
  R2_ACCESS_KEY_ID: devOrRequired('dev_placeholder'),
  R2_SECRET_ACCESS_KEY: devOrRequired('dev_placeholder'),
  R2_BUCKET_NAME: Joi.string().default('inventory-dev'),
  R2_PUBLIC_URL: Joi.string().uri().default('http://localhost:9000'),

  // PDF — runs in Docker locally
  GOTENBERG_URL: Joi.string().uri().default('http://localhost:3002'),

  SENTRY_DSN: Joi.string().optional().allow(''),
  SENTRY_ENVIRONMENT: Joi.string().default('development'),
})
