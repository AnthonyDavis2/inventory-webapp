<template>
  <div class="max-w-2xl">
    <PageHeader title="New Inventory Transfer">
      <template #actions>
        <UButton to="/app/inventory/transfers" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="From Warehouse" required>
          <USelect v-model="form.from_warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="To Warehouse" required>
          <USelect v-model="form.to_warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <UFormGroup label="Notes">
        <UInput v-model="form.notes" />
      </UFormGroup>
      <div class="border-t border-gray-100 pt-4">
        <h3 class="text-sm font-semibold mb-3">Lines</h3>
        <div v-for="(line, i) in form.lines" :key="i" class="flex gap-3 mb-3">
          <USelect v-model="line.product_id" :options="products" option-attribute="label" value-attribute="value" placeholder="Product" class="flex-1" />
          <UInput v-model="line.quantity" type="number" min="0.0001" placeholder="Qty" class="w-28" />
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="form.lines.push({ product_id: '', quantity: '' })">+ Add line</button>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Post Transfer</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ from_warehouse_id: '', to_warehouse_id: '', notes: '', lines: [{ product_id: '', quantity: '' }] })
const loading = ref(false)
const error = ref('')
const warehouses = ref<{ label: string; value: string }[]>([])
const products = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const [wh, prod] = await Promise.all([
    request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
  ])
  warehouses.value = (wh as any).data.map((w: any) => ({ label: w.name, value: w.id }))
  products.value = (prod as any).data.map((p: any) => ({ label: `${p.sku} – ${p.name}`, value: p.id }))
})
async function save() {
  loading.value = true
  error.value = ''
  try {
    await request('/inventory/transfers', {
      method: 'POST',
      body: {
        from_warehouse_id: form.from_warehouse_id,
        to_warehouse_id: form.to_warehouse_id,
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({ product_id: l.product_id, quantity: Number(l.quantity) })),
      },
    })
    await router.push('/app/inventory/transfers')
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
