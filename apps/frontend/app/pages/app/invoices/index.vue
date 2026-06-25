<template>
  <div>
    <PageHeader title="Invoices">
      <template #actions>
        <UButton to="/app/invoices/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Invoice</UButton>
      </template>
    </PageHeader>
    <div class="flex gap-3 mb-4">
      <USelect v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-44" @change="fetchInvoices" />
    </div>
    <DataTable :columns="columns" :rows="invoices" :loading="loading">
      <template #invoice_number="{ row }">
        <NuxtLink :to="`/app/invoices/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.invoice_number }}</NuxtLink>
      </template>
      <template #status="{ row }">
        <UBadge :label="row.status" :color="row.status === 'OVERDUE' ? 'red' : row.status === 'PAID' ? 'green' : 'gray'" variant="soft" />
      </template>
      <template #total_cents="{ row }">{{ formatCurrency(row.total_cents) }}</template>
      <template #amount_due_cents="{ row }">{{ formatCurrency(row.amount_due_cents) }}</template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchInvoices" />
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const invoices = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 25
const loading = ref(true)
const statusFilter = ref('')
const statusOptions = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Sent', value: 'SENT' },
  { label: 'Partially Paid', value: 'PARTIALLY_PAID' }, { label: 'Paid', value: 'PAID' }, { label: 'Overdue', value: 'OVERDUE' },
]
const columns = [
  { key: 'invoice_number', label: 'Invoice #' }, { key: 'customer.name', label: 'Customer' },
  { key: 'status', label: 'Status' }, { key: 'total_cents', label: 'Total' }, { key: 'amount_due_cents', label: 'Due' }, { key: 'due_date', label: 'Due Date' },
]
async function fetchInvoices() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/invoices', { query: { status: statusFilter.value, page: page.value, limit: perPage } })
    invoices.value = (data as any).data ?? data; total.value = (data as any).total ?? invoices.value.length
  }
  finally { loading.value = false }
}
onMounted(fetchInvoices)
</script>
