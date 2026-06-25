<template>
  <div v-if="po">
    <PageHeader :title="po.po_number">
      <template #actions>
        <UButton v-if="po.status === 'DRAFT'" :to="`/app/purchasing/orders/${po.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton v-if="po.status === 'PENDING_APPROVAL'" :loading="actioning" variant="outline" size="sm" @click="action('approve')">Approve</UButton>
        <UButton v-if="['APPROVED','SENT','PARTIALLY_RECEIVED'].includes(po.status)" :to="`/app/purchasing/orders/${po.id}/receive`" class="bg-indigo-600 hover:bg-indigo-700" size="sm">Receive</UButton>
        <UButton v-if="['DRAFT','APPROVED'].includes(po.status)" :loading="actioning" variant="outline" size="sm" color="red" @click="action('cancel')">Cancel</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Order Details">
          <InfoRow label="Status" :value="po.status.replace(/_/g, ' ')" />
          <InfoRow label="Vendor" :value="po.vendor?.name" />
          <InfoRow label="Warehouse" :value="po.warehouse?.name" />
          <InfoRow label="Payment Terms" :value="po.payment_terms" />
          <InfoRow label="Expected Delivery" :value="po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : undefined" />
          <InfoRow label="Total" :value="formatCurrency(po.total_cents)" />
        </InfoCard>

        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100">
            <h3 class="text-sm font-semibold">Line Items</h3>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th class="px-4 py-2 text-left">Product</th>
                <th class="px-4 py-2 text-right">Ordered</th>
                <th class="px-4 py-2 text-right">Received</th>
                <th class="px-4 py-2 text-right">Unit Cost</th>
                <th class="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="line in po.lines" :key="line.id">
                <td class="px-4 py-3">
                  <p class="font-medium">{{ line.product?.name }}</p>
                  <p class="text-xs text-gray-500 font-mono">{{ line.product?.sku }}</p>
                </td>
                <td class="px-4 py-3 text-right">{{ line.quantity_ordered }}</td>
                <td class="px-4 py-3 text-right">{{ line.quantity_received }}</td>
                <td class="px-4 py-3 text-right">{{ formatCurrency(line.unit_cost_cents) }}</td>
                <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(line.total_cents) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="space-y-4">
        <InfoCard title="Notes">
          <p class="text-sm text-gray-600">{{ po.notes || 'No notes' }}</p>
        </InfoCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const po = ref<any>(null)
const actioning = ref(false)
onMounted(async () => {
  po.value = await request<any>(`/purchasing/orders/${route.params.id}`)
})
async function action(act: string) {
  actioning.value = true
  try {
    po.value = await request<any>(`/purchasing/orders/${route.params.id}/status`, { method: 'PATCH', body: { action: act } })
  }
  catch (e: any) { alert(e?.data?.message ?? 'Action failed') }
  finally { actioning.value = false }
}
</script>
