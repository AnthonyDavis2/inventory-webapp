<template>
  <div>
    <PageHeader title="Work Order Cost Summary" />
    <DataTable :columns="columns" :rows="rows" :loading="loading">
      <template #planned_cost_cents="{ row }">{{ formatCurrency(Number(row.planned_cost_cents)) }}</template>
      <template #actual_cost_cents="{ row }">{{ formatCurrency(Number(row.actual_cost_cents)) }}</template>
      <template #variance_cents="{ row }">
        <span :class="Number(row.variance_cents) > 0 ? 'text-red-600' : 'text-green-600'">{{ formatCurrency(Math.abs(Number(row.variance_cents))) }}</span>
      </template>
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
  { key: 'wo_number', label: 'WO #' }, { key: 'product.name', label: 'Product' },
  { key: 'planned_cost_cents', label: 'Planned' }, { key: 'actual_cost_cents', label: 'Actual' }, { key: 'variance_cents', label: 'Variance' },
]
onMounted(async () => {
  try { rows.value = await request<any[]>('/costing/work-order-variance') }
  finally { loading.value = false }
})
</script>
