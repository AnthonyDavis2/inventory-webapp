<template>
  <div class="max-w-3xl">
    <PageHeader title="New Quote">
      <template #actions>
        <UButton to="/app/sales/quotes" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Customer" required>
          <USelect v-model="form.customer_id" :options="customers" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Expires">
          <UInput v-model="form.expires_at" type="date" />
        </UFormGroup>
      </div>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="2" />
      </UFormGroup>
      <div class="border-t border-gray-100 pt-5">
        <h3 class="text-sm font-semibold mb-3">Lines</h3>
        <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-4 gap-3 mb-3 items-end">
          <UFormGroup label="Product" class="col-span-2">
            <USelect v-model="line.product_id" :options="products" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Qty">
            <UInput v-model="line.quantity" type="number" min="0.0001" step="any" />
          </UFormGroup>
          <UFormGroup label="Unit Price ($)">
            <UInput v-model="line.unit_price" type="number" step="0.01" min="0" />
          </UFormGroup>
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="form.lines.push({ product_id: '', quantity: '', unit_price: '' })">+ Add line</button>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Quote</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ customer_id: '', expires_at: '', notes: '', lines: [{ product_id: '', quantity: '', unit_price: '' }] })
const loading = ref(false)
const error = ref('')
const customers = ref<{ label: string; value: string }[]>([])
const products = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const [c, p] = await Promise.all([
    request<{ data: any[] }>('/customers').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
  ])
  customers.value = (c as any).data.map((x: any) => ({ label: x.name, value: x.id }))
  products.value = (p as any).data.map((x: any) => ({ label: `${x.sku} – ${x.name}`, value: x.id }))
})
async function save() {
  loading.value = true; error.value = ''
  try {
    const q = await request<any>('/sales/quotes', {
      method: 'POST',
      body: {
        customer_id: form.customer_id,
        expires_at: form.expires_at || undefined,
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: l.product_id, quantity: Number(l.quantity),
          unit_price_cents: dollarsToCents(Number(l.unit_price)), uom_id: '',
        })),
      },
    })
    await router.push(`/app/sales/quotes/${q.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
