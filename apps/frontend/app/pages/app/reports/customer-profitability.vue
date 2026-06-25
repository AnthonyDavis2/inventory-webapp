<template>
  <div>
    <PageHeader title="Customer Profitability" />
    <DataTable :columns="columns" :rows="rows" :loading="loading">
      <template #revenue_cents="{ row }">{{ formatCurrency(Number(row.revenue_cents)) }}</template>
      <template #cogs_cents="{ row }">{{ formatCurrency(Number(row.cogs_cents)) }}</template>
      <template #gross_profit_cents="{ row }">{{ formatCurrency(Number(row.gross_profit_cents)) }}</template>
      <template #margin_pct="{ row }">
        <span :class="row.margin_pct > 0 ? 'text-green-600' : 'text-red-600'">{{ row.margin_pct?.toFixed(1) }}%</span>
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
  { key: 'customer_name', label: 'Customer' }, { key: 'revenue_cents', label: 'Revenue' },
  { key: 'cogs_cents', label: 'COGS' }, { key: 'gross_profit_cents', label: 'Gross Profit' }, { key: 'margin_pct', label: 'Margin %' },
]
onMounted(async () => {
  try { rows.value = await request<any[]>('/reporting/customer-profitability') }
  finally { loading.value = false }
})
</script>
