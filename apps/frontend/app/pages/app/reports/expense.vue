<template>
  <div>
    <PageHeader title="Expense Report" />
    <DataTable :columns="columns" :rows="rows" :loading="loading">
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
const columns = [{ key: 'category_name', label: 'Category' }, { key: 'count', label: '# Expenses' }, { key: 'total_cents', label: 'Total' }]
onMounted(async () => {
  try { rows.value = await request<any[]>('/reporting/expenses') }
  finally { loading.value = false }
})
</script>
