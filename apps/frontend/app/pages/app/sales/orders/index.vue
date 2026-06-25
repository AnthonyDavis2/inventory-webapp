<template>
  <div>
    <PageHeader title="Sales Orders">
      <template #actions>
        <UButton to="/app/sales/orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Order</UButton>
      </template>
    </PageHeader>
    <div class="flex gap-3 mb-4">
      <USelect v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-48" @change="fetchOrders" />
    </div>
    <DataTable :columns="columns" :rows="orders" :loading="loading">
      <template #so_number="{ row }">
        <NuxtLink :to="`/app/sales/orders/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.so_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status.replace(/_/g,' ')" variant="soft" /></template>
      <template #total_cents="{ row }">{{ formatCurrency(row.total_cents) }}</template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchOrders" />
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 25
const loading = ref(true)
const statusFilter = ref('')
const statusOptions = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Partially Fulfilled', value: 'PARTIALLY_FULFILLED' }, { label: 'Fulfilled', value: 'FULFILLED' },
]
const columns = [
  { key: 'so_number', label: 'SO #' }, { key: 'customer.name', label: 'Customer' },
  { key: 'status', label: 'Status' }, { key: 'total_cents', label: 'Total' },
]
async function fetchOrders() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/sales/orders', { query: { status: statusFilter.value, page: page.value, limit: perPage } })
    orders.value = (data as any).data ?? data; total.value = (data as any).total ?? orders.value.length
  }
  finally { loading.value = false }
}
onMounted(fetchOrders)
</script>
