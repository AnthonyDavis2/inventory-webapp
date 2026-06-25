<template>
  <div>
    <PageHeader title="Inventory Valuation">
      <template #actions>
        <UButton variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" @click="exportCsv">Export CSV</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading">
      <template #total_value_cents="{ row }">{{ formatCurrency(Number(row.total_value_cents)) }}</template>
      <template #unit_cost_cents="{ row }">{{ formatCurrency(Number(row.unit_cost_cents)) }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const rows = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'product.sku', label: 'SKU' }, { key: 'product.name', label: 'Product' },
  { key: 'warehouse.name', label: 'Warehouse' }, { key: 'quantity_on_hand', label: 'On Hand' },
  { key: 'unit_cost_cents', label: 'Unit Cost' }, { key: 'total_value_cents', label: 'Total Value' },
]
onMounted(async () => {
  try { rows.value = await request<any[]>('/reporting/inventory-valuation') }
  finally { loading.value = false }
})
async function exportCsv() {
  const blob = await request<Blob>('/reporting/inventory-valuation/export', { responseType: 'blob' })
  const url = URL.createObjectURL(blob as any)
  const a = document.createElement('a'); a.href = url; a.download = 'inventory-valuation.csv'; a.click()
}
</script>
