<template>
  <div>
    <PageHeader title="Quotes">
      <template #actions>
        <UButton to="/app/sales/quotes/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Quote</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="quotes" :loading="loading">
      <template #quote_number="{ row }">
        <NuxtLink :to="`/app/sales/quotes/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.quote_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
      <template #total_cents="{ row }">{{ formatCurrency(row.total_cents) }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const quotes = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'quote_number', label: 'Quote #' }, { key: 'customer.name', label: 'Customer' },
  { key: 'status', label: 'Status' }, { key: 'total_cents', label: 'Total' }, { key: 'expires_at', label: 'Expires' },
]
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/sales/quotes'); quotes.value = (data as any).data ?? data }
  finally { loading.value = false }
})
</script>
