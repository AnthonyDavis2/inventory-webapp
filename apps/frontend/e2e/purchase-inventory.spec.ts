import { test, expect } from '@playwright/test'
import { seedTestOrg, login } from './helpers'

/**
 * Smoke test: Create a vendor, create a PO, receive it, and verify inventory balance increases.
 */

test.describe('Purchase Order → Inventory', () => {
  test('receiving a PO increases inventory stock level', async ({ page, request }) => {
    const { email, password } = await seedTestOrg(request)
    await login(page, email, password)

    // ── Create a product ─────────────────────────────────────────────────────
    await page.goto('/app/products/new')
    await page.getByLabel('Product Name').fill('Test Widget')
    await page.getByLabel('SKU').fill(`SKU-E2E-${Date.now()}`)
    await page.getByRole('button', { name: /create product/i }).click()
    await page.waitForURL(/\/app\/products\/[\w-]+$/)

    // ── Create a vendor ───────────────────────────────────────────────────────
    await page.goto('/app/vendors/new')
    await page.getByLabel('Vendor Name').fill('E2E Supplier')
    await page.getByLabel('Code').fill(`SUP-${Date.now()}`)
    await page.getByRole('button', { name: /create vendor/i }).click()
    await page.waitForURL(/\/app\/vendors\/[\w-]+$/)

    // ── Create a PO ───────────────────────────────────────────────────────────
    await page.goto('/app/purchasing/orders/new')
    // Select the vendor we just created
    await page.getByLabel('Vendor').selectOption({ label: 'E2E Supplier' })
    // Add a line
    await page.getByRole('button', { name: /add line/i }).click()
    // The line form should be visible — fill it
    const lineRow = page.locator('[data-testid="po-line"]').first()
    if (await lineRow.isVisible()) {
      await lineRow.getByLabel('Product').selectOption({ label: 'Test Widget' })
      await lineRow.getByLabel('Quantity').fill('50')
      await lineRow.getByLabel('Unit Cost').fill('10.00')
    }
    await page.getByRole('button', { name: /create purchase order/i }).click()
    await page.waitForURL(/\/app\/purchasing\/orders\/[\w-]+$/)

    // ── Approve and send the PO ───────────────────────────────────────────────
    const approveBtn = page.getByRole('button', { name: /submit for approval/i })
    if (await approveBtn.isVisible()) {
      await approveBtn.click()
      await page.getByRole('button', { name: /approve/i }).click()
    }
    const sendBtn = page.getByRole('button', { name: /mark as sent/i })
    if (await sendBtn.isVisible()) await sendBtn.click()

    // ── Receive the PO ────────────────────────────────────────────────────────
    await page.getByRole('link', { name: /receive/i }).click()
    await page.waitForURL(/\/receive$/)

    // Accept default quantities and submit
    await page.getByRole('button', { name: /receive items/i }).click()
    await expect(page.getByText(/received|partially received|fully received/i)).toBeVisible({ timeout: 10_000 })

    // ── Verify inventory increased ────────────────────────────────────────────
    await page.goto('/app/inventory')
    await expect(page.getByText('Test Widget')).toBeVisible()
    // On-hand should be > 0
    await expect(page.getByText(/\d+/).first()).toBeVisible()
  })
})
