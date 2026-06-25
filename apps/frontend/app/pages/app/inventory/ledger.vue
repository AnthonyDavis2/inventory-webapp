<template>
  <div>
    <PageHeader title="Inventory Ledger" />

    <div class="flex gap-3 mb-4">
      <USelect v-model="warehouseFilter" :options="warehouseOptions" option-attribute="label" value-attribute="value" placeholder="All warehouses" class="w-44" @change="fetchLedger" />
    </div>

    <DataTable :columns="columns" :rows="entries" :loading="loading">
      <template #movement_type="{ row }">
        <UBadge :label="row.movement_type.replace('_', ' ')" variant="soft" />
      </template>
      <template #quantity="{ row }">
        <span :class="row.quantity < 0 ? 'text-red-600' : 'text-green-600'" class="font-mono font-medium">
          {{ row.quantity > 0 ? '+' : '' }}{{ row.quantity }}
        </span>
      </template>
      <template #created_at="{ row }">
        {{ new Date(row.created_at).toLocaleDateString() }}
      </template>
    </DataTable>

    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchLedger" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const entries = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 50
const loading = ref(true)
const warehouseFilter = ref('')
const warehouseOptions = ref<{ label: string; value: string }[]>([{ label: 'All warehouses', value: '' }])

const columns = [
  { key: 'created_at', label: 'Date' },
  { key: 'movement_type', label: 'Type' },
  { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' },
  { key: 'warehouse.name', label: 'Warehouse' },
  { key: 'quantity', label: 'Qty' },
  { key: 'reference_type', label: 'Ref Type' },
]

onMounted(async () => {
  const wh = await request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] }))
  warehouseOptions.value = [
    { label: 'All warehouses', value: '' },
    ...(wh as any).data.map((w: any) => ({ label: w.name, value: w.id })),
  ]
  await fetchLedger()
})

async function fetchLedger() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/inventory/ledger', {
      query: { warehouse_id: warehouseFilter.value, page: page.value, limit: perPage },
    })
    entries.value = (data as any).data ?? data
    total.value = (data as any).total ?? entries.value.length
  }
  finally { loading.value = false }
}
</script>
