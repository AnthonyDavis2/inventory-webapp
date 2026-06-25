import { test, expect } from '@playwright/test'

/**
 * Smoke test: Register a new org and complete all 7 onboarding steps.
 * Requires the backend to be running with a clean test database.
 */

const uniqueSlug = `e2e-${Date.now()}`
const testEmail = `${uniqueSlug}@test-e2e.com`
const testPassword = 'TestPass123!'
const orgName = `E2E Org ${Date.now()}`

test.describe('Register and complete onboarding', () => {
  test('can register a new organization', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Company Name').fill(orgName)
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password').fill(testPassword)
    await page.getByRole('button', { name: /create account/i }).click()

    // Should redirect to onboarding
    await expect(page).toHaveURL(/\/onboarding/)
  })

  test('completes onboarding step 1 — business type', async ({ page }) => {
    // Login with the registered account
    await page.goto('/login')
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password').fill(testPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/onboarding/)

    // Step 1: Select business type
    await page.getByText('Manufacturer').click()
    await page.getByRole('button', { name: /continue/i }).click()

    await expect(page).toHaveURL(/\/onboarding\/2/)
  })

  test('completes onboarding through step 7 and lands on dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password').fill(testPassword)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/onboarding/)

    // Step 1: Business type
    await page.getByText('Manufacturer').first().click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/2/)

    // Step 2: Company details
    await page.getByLabel('Phone').fill('555-0100')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/3/)

    // Step 3: Address
    await page.getByLabel('Street Address').fill('123 Factory Lane')
    await page.getByLabel('City').fill('Detroit')
    await page.getByLabel('State').fill('MI')
    await page.getByLabel('ZIP').fill('48201')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/4/)

    // Step 4: Tax — skip with default
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/5/)

    // Step 5: Costing method
    await page.getByText(/FIFO/i).first().click()
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/6/)

    // Step 6: First warehouse
    await page.getByLabel('Warehouse Name').fill('Main Warehouse')
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForURL(/\/onboarding\/7/)

    // Step 7: Invite team — skip
    await page.getByRole('button', { name: /continue/i }).click()

    // Should reach dashboard
    await expect(page).toHaveURL(/\/app\/dashboard/, { timeout: 10_000 })
    await expect(page.getByText(/dashboard/i).first()).toBeVisible()
  })
})
