import type { Page } from '@playwright/test'

/** Log in with email/password and wait for redirect to dashboard. */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/app\/dashboard/, { timeout: 15_000 })
}

/**
 * Seed a test org via the registration API and return credentials.
 * Uses $fetch to hit the backend directly so tests don't depend on the UI registration flow.
 */
export async function seedTestOrg(request: import('@playwright/test').APIRequestContext) {
  const slug = `e2e-${Date.now()}`
  const email = `${slug}@e2e-test.local`
  const password = 'TestPass123!'
  const orgName = `E2E Org ${Date.now()}`

  const res = await request.post(`${process.env.E2E_API_URL || 'http://localhost:3001'}/organizations`, {
    data: { name: orgName, email, password, first_name: 'Test', last_name: 'User' },
  })

  if (!res.ok()) throw new Error(`Failed to seed org: ${await res.text()}`)
  return { email, password, orgName }
}
