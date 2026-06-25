<template>
  <div>
    <PageHeader title="Sales">
      <template #actions>
        <UButton to="/app/sales/quotes/new" variant="outline" size="sm">+ New Quote</UButton>
        <UButton to="/app/sales/orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Order</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon :name="item.icon" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
      </NuxtLink>
    </div>

    <DataTable :columns="columns" :rows="orders" :loading="loading">
      <template #so_number="{ row }">
        <NuxtLink :to="`/app/sales/orders/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.so_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status.replace(/_/g,' ')" variant="soft" /></template>
      <template #total_cents="{ row }">{{ formatCurrency(row.total_cents) }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const orders = ref<any[]>([])
const loading = ref(true)
const navItems = [
  { to: '/app/sales/quotes', icon: 'i-heroicons-document', label: 'Quotes' },
  { to: '/app/sales/orders', icon: 'i-heroicons-shopping-bag', label: 'Sales Orders' },
  { to: '/app/sales/shipments', icon: 'i-heroicons-truck', label: 'Shipments' },
  { to: '/app/sales/returns', icon: 'i-heroicons-arrow-uturn-left', label: 'Returns (RMA)' },
]
const columns = [
  { key: 'so_number', label: 'SO #' },
  { key: 'customer.name', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'total_cents', label: 'Total' },
  { key: 'created_at', label: 'Date' },
]
onMounted(async () => {
  try {
    const data = await request<{ data: any[] }>('/sales/orders', { query: { limit: 10 } })
    orders.value = (data as any).data ?? data
  }
  finally { loading.value = false }
})
</script>
