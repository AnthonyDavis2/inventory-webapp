import type { SubscriptionPlan } from '@prisma/client'

export const TRIAL_DAYS = 14

export interface PlanLimits {
  users: number
  products: number
  warehouses: number
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  STARTER: { users: 3, products: 500, warehouses: 1 },
  GROWTH: { users: 10, products: 5_000, warehouses: 3 },
  BUSINESS: { users: Infinity, products: Infinity, warehouses: Infinity },
  ENTERPRISE: { users: Infinity, products: Infinity, warehouses: Infinity },
}
