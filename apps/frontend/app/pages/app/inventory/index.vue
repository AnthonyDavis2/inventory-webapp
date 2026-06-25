<template>
  <div>
    <PageHeader title="Inventory">
      <template #actions>
        <UButton to="/app/inventory/adjustments/new" variant="outline" size="sm">New Adjustment</UButton>
        <UButton to="/app/inventory/transfers/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">New Transfer</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors"
      >
        <UIcon :name="item.icon" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ item.desc }}</p>
      </NuxtLink>
    </div>

    <DataTable :columns="columns" :rows="stockLevels" :loading="loading">
      <template #product.sku="{ row }">
        <NuxtLink :to="`/app/products/${row.product_id}`" class="text-indigo-600 hover:underline font-mono text-sm">
          {{ row.product?.sku }}
        </NuxtLink>
      </template>
      <template #quantity_on_hand="{ row }">
        <span class="font-semibold" :class="row.quantity_on_hand <= 0 ? 'text-red-600' : ''">
          {{ row.quantity_on_hand }}
        </span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const stockLevels = ref<any[]>([])
const loading = ref(true)

const navItems = [
  { to: '/app/inventory/ledger', icon: 'i-heroicons-document-text', label: 'Ledger', desc: 'All movements' },
  { to: '/app/inventory/adjustments', icon: 'i-heroicons-adjustments-horizontal', label: 'Adjustments', desc: 'Corrections & opening balances' },
  { to: '/app/inventory/transfers', icon: 'i-heroicons-arrows-right-left', label: 'Transfers', desc: 'Move between warehouses' },
  { to: '/app/inventory/cycle-counts', icon: 'i-heroicons-clipboard-document-check', label: 'Cycle Counts', desc: 'Physical count reconciliation' },
]

const columns = [
  { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' },
  { key: 'warehouse.name', label: 'Warehouse' },
  { key: 'quantity_on_hand', label: 'On Hand' },
  { key: 'quantity_reserved', label: 'Reserved' },
  { key: 'quantity_available', label: 'Available' },
]

onMounted(async () => {
  try {
    stockLevels.value = await request<any[]>('/inventory/stock')
  }
  finally { loading.value = false }
})
</script>
