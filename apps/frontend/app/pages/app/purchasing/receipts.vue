<template>
  <div>
    <PageHeader title="Receipts" />
    <DataTable :columns="columns" :rows="receipts" :loading="loading">
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleDateString() }}</template>
      <template #total_cost_cents="{ row }">{{ formatCurrency(row.total_cost_cents) }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const receipts = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'Date' },
  { key: 'po.po_number', label: 'PO #' },
  { key: 'po.vendor.name', label: 'Vendor' },
  { key: 'total_cost_cents', label: 'Total Cost' },
]
onMounted(async () => {
  try { receipts.value = await request<any[]>('/purchasing/receipts') }
  finally { loading.value = false }
})
</script>
