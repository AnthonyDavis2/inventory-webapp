<template>
  <div class="max-w-3xl">
    <PageHeader title="New Purchase Order">
      <template #actions>
        <UButton to="/app/purchasing/orders" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Vendor" required>
          <USelect v-model="form.vendor_id" :options="vendors" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Warehouse" required>
          <USelect v-model="form.warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Expected Delivery">
          <UInput v-model="form.expected_delivery" type="date" />
        </UFormGroup>
        <UFormGroup label="Payment Terms">
          <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="2" />
      </UFormGroup>

      <div class="border-t border-gray-100 pt-5">
        <h3 class="text-sm font-semibold mb-3">Line Items</h3>
        <div class="space-y-3">
          <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-4 gap-3 items-end">
            <UFormGroup label="Product" class="col-span-2">
              <USelect v-model="line.product_id" :options="products" option-attribute="label" value-attribute="value" />
            </UFormGroup>
            <UFormGroup label="Qty">
              <UInput v-model="line.quantity" type="number" min="0.0001" step="any" />
            </UFormGroup>
            <UFormGroup label="Unit Cost ($)">
              <UInput v-model="line.unit_cost" type="number" step="0.01" min="0" />
            </UFormGroup>
          </div>
        </div>
        <button type="button" class="mt-3 text-sm text-indigo-600 hover:underline" @click="form.lines.push({ product_id: '', quantity: '', unit_cost: '' })">
          + Add line
        </button>
      </div>

      <div class="flex justify-end pt-4 border-t border-gray-100 gap-3">
        <UButton variant="outline" :loading="loading" @click="save('DRAFT')">Save as Draft</UButton>
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save('PENDING_APPROVAL')">Submit for Approval</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({
  vendor_id: '', warehouse_id: '', expected_delivery: '', payment_terms: 'NET30', notes: '',
  lines: [{ product_id: '', quantity: '', unit_cost: '' }],
})
const loading = ref(false)
const error = ref('')
const vendors = ref<{ label: string; value: string }[]>([])
const warehouses = ref<{ label: string; value: string }[]>([])
const products = ref<{ label: string; value: string }[]>([])
const paymentTerms = [
  { label: 'Net 30', value: 'NET30' }, { label: 'Net 60', value: 'NET60' },
  { label: 'Net 15', value: 'NET15' }, { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' },
]
onMounted(async () => {
  const [v, w, p] = await Promise.all([
    request<{ data: any[] }>('/vendors').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
  ])
  vendors.value = (v as any).data.map((x: any) => ({ label: x.name, value: x.id }))
  warehouses.value = (w as any).data.map((x: any) => ({ label: x.name, value: x.id }))
  products.value = (p as any).data.map((x: any) => ({ label: `${x.sku} – ${x.name}`, value: x.id }))
})
async function save(submitAction?: string) {
  loading.value = true; error.value = ''
  try {
    const po = await request<any>('/purchasing/orders', {
      method: 'POST',
      body: {
        vendor_id: form.vendor_id,
        warehouse_id: form.warehouse_id,
        expected_delivery: form.expected_delivery || undefined,
        payment_terms: form.payment_terms,
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_cost_cents: l.unit_cost ? dollarsToCents(Number(l.unit_cost)) : 0,
        })),
      },
    })
    if (submitAction === 'PENDING_APPROVAL') {
      await request(`/purchasing/orders/${po.id}/status`, { method: 'PATCH', body: { action: 'submit' } })
    }
    await router.push(`/app/purchasing/orders/${po.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed to create PO' }
  finally { loading.value = false }
}
</script>
