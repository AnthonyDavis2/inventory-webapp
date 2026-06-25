<template>
  <div v-if="so">
    <PageHeader :title="so.so_number">
      <template #actions>
        <UButton v-if="so.status === 'DRAFT'" :to="`/app/sales/orders/${so.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton v-if="so.status === 'DRAFT'" :loading="actioning" variant="outline" size="sm" @click="action('confirm')">Confirm</UButton>
        <UButton v-if="['CONFIRMED','PARTIALLY_FULFILLED'].includes(so.status)" :to="`/app/sales/orders/${so.id}/fulfill`" class="bg-indigo-600 hover:bg-indigo-700" size="sm">Fulfill / Ship</UButton>
        <UButton v-if="so.status === 'CONFIRMED'" :loading="invoicing" variant="outline" size="sm" @click="createInvoice">Create Invoice</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Order Details">
          <InfoRow label="Status" :value="so.status.replace(/_/g,' ')" />
          <InfoRow label="Customer" :value="so.customer?.name" />
          <InfoRow label="Warehouse" :value="so.warehouse?.name" />
          <InfoRow label="Payment Terms" :value="so.payment_terms" />
          <InfoRow label="Total" :value="formatCurrency(so.total_cents)" />
        </InfoCard>
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100"><h3 class="text-sm font-semibold">Line Items</h3></div>
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th class="px-4 py-2 text-left">Product</th>
                <th class="px-4 py-2 text-right">Ordered</th>
                <th class="px-4 py-2 text-right">Fulfilled</th>
                <th class="px-4 py-2 text-right">Unit Price</th>
                <th class="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="line in so.lines" :key="line.id">
                <td class="px-4 py-3"><p class="font-medium">{{ line.product?.name }}</p><p class="text-xs text-gray-500 font-mono">{{ line.product?.sku }}</p></td>
                <td class="px-4 py-3 text-right">{{ line.quantity_ordered }}</td>
                <td class="px-4 py-3 text-right">{{ line.quantity_fulfilled }}</td>
                <td class="px-4 py-3 text-right">{{ formatCurrency(line.unit_price_cents) }}</td>
                <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(line.total_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <InfoCard title="Notes">
          <p class="text-sm text-gray-600">{{ so.notes || 'No notes' }}</p>
        </InfoCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const so = ref<any>(null)
const actioning = ref(false)
const invoicing = ref(false)
onMounted(async () => { so.value = await request<any>(`/sales/orders/${route.params.id}`) })
async function action(act: string) {
  actioning.value = true
  try { so.value = await request<any>(`/sales/orders/${route.params.id}/status`, { method: 'PATCH', body: { action: act } }) }
  catch (e: any) { alert(e?.data?.message ?? 'Failed') }
  finally { actioning.value = false }
}
async function createInvoice() {
  invoicing.value = true
  try {
    const inv = await request<any>(`/sales-orders/${route.params.id}/invoice`, { method: 'POST' })
    await router.push(`/app/invoices/${inv.id}`)
  }
  catch (e: any) { alert(e?.data?.message ?? 'Failed') }
  finally { invoicing.value = false }
}
</script>
