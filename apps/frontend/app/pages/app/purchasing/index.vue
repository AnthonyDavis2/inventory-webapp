<template>
  <div>
    <PageHeader title="Purchasing">
      <template #actions>
        <UButton to="/app/purchasing/orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New PO</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon :name="item.icon" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
      </NuxtLink>
    </div>

    <DataTable :columns="columns" :rows="orders" :loading="loading">
      <template #po_number="{ row }">
        <NuxtLink :to="`/app/purchasing/orders/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.po_number }}</NuxtLink>
      </template>
      <template #status="{ row }">
        <UBadge :label="row.status.replace('_', ' ')" variant="soft" />
      </template>
      <template #total_cents="{ row }">{{ formatCurrency(row.total_cents) }}</template>
      <template #ordered_at="{ row }">{{ new Date(row.ordered_at ?? row.created_at).toLocaleDateString() }}</template>
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
  { to: '/app/purchasing/orders', icon: 'i-heroicons-document-text', label: 'Purchase Orders' },
  { to: '/app/purchasing/receipts', icon: 'i-heroicons-inbox-arrow-down', label: 'Receipts' },
  { to: '/app/purchasing/recommendations', icon: 'i-heroicons-light-bulb', label: 'Reorder Recommendations' },
]
const columns = [
  { key: 'po_number', label: 'PO #' },
  { key: 'vendor.name', label: 'Vendor' },
  { key: 'status', label: 'Status' },
  { key: 'total_cents', label: 'Total' },
  { key: 'ordered_at', label: 'Date' },
]
onMounted(async () => {
  try {
    const data = await request<{ data: any[] }>('/purchasing/orders', { query: { limit: 10 } })
    orders.value = (data as any).data ?? data
  }
  finally { loading.value = false }
})
</script>
