<template>
  <div class="max-w-xl">
    <PageHeader title="New Work Order">
      <template #actions>
        <UButton to="/app/manufacturing/work-orders" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Product" required>
        <USelect v-model="form.product_id" :options="products" option-attribute="label" value-attribute="value" @change="loadBOMs" />
      </UFormGroup>
      <UFormGroup label="BOM Version" required>
        <USelect v-model="form.bom_version_id" :options="bomVersions" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Warehouse" required>
        <USelect v-model="form.warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Quantity" required>
        <UInput v-model="form.quantity_planned" type="number" min="0.0001" step="any" />
      </UFormGroup>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Scheduled Start">
          <UInput v-model="form.scheduled_start" type="date" />
        </UFormGroup>
        <UFormGroup label="Scheduled End">
          <UInput v-model="form.scheduled_end" type="date" />
        </UFormGroup>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Work Order</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ product_id: '', bom_version_id: '', warehouse_id: '', quantity_planned: '', scheduled_start: '', scheduled_end: '' })
const loading = ref(false)
const error = ref('')
const products = ref<{ label: string; value: string }[]>([])
const warehouses = ref<{ label: string; value: string }[]>([])
const bomVersions = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const [p, w] = await Promise.all([
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
    request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] })),
  ])
  products.value = (p as any).data.map((x: any) => ({ label: `${x.sku} – ${x.name}`, value: x.id }))
  warehouses.value = (w as any).data.map((x: any) => ({ label: x.name, value: x.id }))
})
async function loadBOMs() {
  if (!form.product_id) return
  const boms = await request<{ data: any[] }>('/manufacturing/boms', { query: { product_id: form.product_id } }).catch(() => ({ data: [] }))
  bomVersions.value = (boms as any).data.flatMap((b: any) =>
    (b.versions ?? []).map((v: any) => ({ label: `${b.name} v${v.version_number}${v.is_active ? ' (active)' : ''}`, value: v.id })),
  )
}
async function save() {
  loading.value = true; error.value = ''
  try {
    const wo = await request<any>('/manufacturing/work-orders', {
      method: 'POST',
      body: {
        product_id: form.product_id,
        bom_version_id: form.bom_version_id,
        warehouse_id: form.warehouse_id,
        quantity_planned: Number(form.quantity_planned),
        scheduled_start: form.scheduled_start || undefined,
        scheduled_end: form.scheduled_end || undefined,
      },
    })
    await router.push(`/app/manufacturing/work-orders/${wo.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
