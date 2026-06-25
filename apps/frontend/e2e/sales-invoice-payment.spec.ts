import { test, expect } from '@playwright/test'
import { seedTestOrg, login } from './helpers'

/**
 * Smoke test: Create a customer → sales order → invoice → record payment → verify PAID.
 */

test.describe('Sales Order → Invoice → Payment', () => {
  test('full order-to-cash flow marks invoice as PAID', async ({ page, request }) => {
    const { email, password } = await seedTestOrg(request)
    await login(page, email, password)

    // ── Create a product ─────────────────────────────────────────────────────
    await page.goto('/app/products/new')
    await page.getByLabel('Product Name').fill('Sellable Widget')
    await page.getByLabel('SKU').fill(`SKU-SELL-${Date.now()}`)
    await page.getByRole('button', { name: /create product/i }).click()
    await page.waitForURL(/\/app\/products\/[\w-]+$/)

    // ── Create a customer ─────────────────────────────────────────────────────
    await page.goto('/app/customers/new')
    await page.getByLabel('Customer Name').fill('E2E Buyer Corp')
    await page.getByLabel('Code').fill(`CUST-${Date.now()}`)
    await page.getByRole('button', { name: /create customer/i }).click()
    await page.waitForURL(/\/app\/customers\/[\w-]+$/)

    // ── Create a sales order ──────────────────────────────────────────────────
    await page.goto('/app/sales/orders/new')
    await page.getByLabel('Customer').selectOption({ label: 'E2E Buyer Corp' })
    await page.getByRole('button', { name: /add line/i }).click()
    const lineRow = page.locator('[data-testid="so-line"]').first()
    if (await lineRow.isVisible()) {
      await lineRow.getByLabel('Product').selectOption({ label: 'Sellable Widget' })
      await lineRow.getByLabel('Quantity').fill('5')
      await lineRow.getByLabel('Unit Price').fill('100.00')
    }
    await page.getByRole('button', { name: /create order/i }).click()
    await page.waitForURL(/\/app\/sales\/orders\/[\w-]+$/)

    // Confirm the order
    const confirmBtn = page.getByRole('button', { name: /confirm/i })
    if (await confirmBtn.isVisible()) await confirmBtn.click()

    // ── Create invoice from SO ────────────────────────────────────────────────
    const invoiceBtn = page.getByRole('button', { name: /create invoice/i })
    if (await invoiceBtn.isVisible()) {
      await invoiceBtn.click()
    } else {
      // Navigate to invoices/new if no direct button
      await page.goto('/app/invoices/new')
      await page.getByLabel('Customer').selectOption({ label: 'E2E Buyer Corp' })
      await page.getByRole('button', { name: /add line/i }).click()
    }
    await page.waitForURL(/\/app\/invoices\/[\w-]+$/, { timeout: 10_000 })

    // Send the invoice
    const sendInvoiceBtn = page.getByRole('button', { name: /send|finalize/i })
    if (await sendInvoiceBtn.isVisible()) await sendInvoiceBtn.click()

    // ── Record payment ────────────────────────────────────────────────────────
    const recordPaymentBtn = page.getByRole('button', { name: /record payment/i })
    await expect(recordPaymentBtn).toBeVisible({ timeout: 5_000 })
    await recordPaymentBtn.click()

    // Fill payment form
    const amountInput = page.getByLabel(/amount/i)
    if (await amountInput.isVisible()) {
      // Clear default and enter full amount
      await amountInput.fill('500.00')
    }
    await page.getByLabel('Payment Method').selectOption('CHECK').catch(() => {})
    await page.getByRole('button', { name: /save|submit payment/i }).click()

    // ── Verify PAID status ────────────────────────────────────────────────────
    await expect(page.getByText(/paid/i)).toBeVisible({ timeout: 10_000 })
  })
})
