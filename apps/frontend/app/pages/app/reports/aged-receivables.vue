<template>
  <div>
    <PageHeader title="Aged Receivables">
      <template #actions>
        <UButton variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" @click="exportCsv">Export CSV</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="rows" :loading="loading">
      <template #current_cents="{ row }">{{ formatCurrency(Number(row.current_cents)) }}</template>
      <template #days_30_cents="{ row }">{{ formatCurrency(Number(row.days_30_cents)) }}</template>
      <template #days_60_cents="{ row }">{{ formatCurrency(Number(row.days_60_cents)) }}</template>
      <template #days_90_plus_cents="{ row }">
        <span :class="Number(row.days_90_plus_cents) > 0 ? 'text-red-600 font-semibold' : ''">{{ formatCurrency(Number(row.days_90_plus_cents)) }}</span>
      </template>
      <template #total_cents="{ row }">{{ formatCurrency(Number(row.total_cents)) }}</template>
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
  { key: 'customer_name', label: 'Customer' }, { key: 'current_cents', label: 'Current' },
  { key: 'days_30_cents', label: '1–30 days' }, { key: 'days_60_cents', label: '31–60 days' },
  { key: 'days_90_plus_cents', label: '90+ days' }, { key: 'total_cents', label: 'Total' },
]
onMounted(async () => {
  try { rows.value = await request<any[]>('/invoicing/aged-receivables') }
  finally { loading.value = false }
})
async function exportCsv() {
  const blob = await request<Blob>('/reporting/aged-receivables/export', { responseType: 'blob' })
  const url = URL.createObjectURL(blob as any); const a = document.createElement('a'); a.href = url; a.download = 'aged-receivables.csv'; a.click()
}
</script>
