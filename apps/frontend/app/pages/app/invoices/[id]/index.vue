<template>
  <div v-if="invoice">
    <PageHeader :title="invoice.invoice_number">
      <template #actions>
        <UButton v-if="invoice.status === 'DRAFT'" :loading="actioning" variant="outline" size="sm" @click="action('send')">Send</UButton>
        <UButton v-if="['SENT','PARTIALLY_PAID','OVERDUE'].includes(invoice.status)" size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showPaymentForm = true">Record Payment</UButton>
        <UButton v-if="invoice.status === 'DRAFT'" :loading="actioning" variant="outline" size="sm" color="red" @click="action('void')">Void</UButton>
      </template>
    </PageHeader>

    <div v-if="showPaymentForm" class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 class="text-sm font-semibold mb-3">Record Payment</h3>
      <div class="grid grid-cols-3 gap-3">
        <UFormGroup label="Amount ($)">
          <UInput v-model="payment.amount" type="number" step="0.01" min="0.01" />
        </UFormGroup>
        <UFormGroup label="Method">
          <USelect v-model="payment.method" :options="paymentMethods" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Date">
          <UInput v-model="payment.paid_at" type="date" />
        </UFormGroup>
      </div>
      <div class="flex gap-2 mt-3">
        <UButton :loading="recordingPayment" class="bg-indigo-600" @click="recordPayment">Record</UButton>
        <UButton variant="outline" @click="showPaymentForm = false">Cancel</UButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Invoice Details">
          <InfoRow label="Status" :value="invoice.status" />
          <InfoRow label="Customer" :value="invoice.customer?.name" />
          <InfoRow label="Due Date" :value="invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : undefined" />
          <InfoRow label="Total" :value="formatCurrency(invoice.total_cents)" />
          <InfoRow label="Paid" :value="formatCurrency(invoice.amount_paid_cents)" />
          <InfoRow label="Balance Due" :value="formatCurrency(invoice.amount_due_cents)" />
        </InfoCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency, dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const invoice = ref<any>(null)
const actioning = ref(false)
const showPaymentForm = ref(false)
const recordingPayment = ref(false)
const payment = reactive({ amount: '', method: 'CHECK', paid_at: new Date().toISOString().split('T')[0] })
const paymentMethods = [
  { label: 'Check', value: 'CHECK' }, { label: 'ACH', value: 'ACH' },
  { label: 'Credit Card', value: 'CREDIT_CARD' }, { label: 'Wire', value: 'WIRE' }, { label: 'Cash', value: 'CASH' },
]
onMounted(async () => { invoice.value = await request<any>(`/invoices/${route.params.id}`) })
async function action(act: string) {
  actioning.value = true
  try { invoice.value = await request<any>(`/invoices/${route.params.id}/${act}`, { method: 'POST' }) }
  catch (e: any) { alert(e?.data?.message) }
  finally { actioning.value = false }
}
async function recordPayment() {
  recordingPayment.value = true
  try {
    invoice.value = await request<any>(`/invoices/${route.params.id}/payments`, {
      method: 'POST',
      body: { amount_cents: dollarsToCents(Number(payment.amount)), method: payment.method, paid_at: payment.paid_at },
    })
    showPaymentForm.value = false
  }
  finally { recordingPayment.value = false }
}
</script>
