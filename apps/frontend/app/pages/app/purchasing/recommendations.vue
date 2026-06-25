<template>
  <div>
    <PageHeader title="Reorder Recommendations" />
    <DataTable :columns="columns" :rows="items" :loading="loading">
      <template #product.sku="{ row }">
        <NuxtLink :to="`/app/products/${row.product_id}`" class="text-indigo-600 hover:underline font-mono">{{ row.product?.sku }}</NuxtLink>
      </template>
      <template #quantity_on_hand="{ row }">
        <span class="text-red-600 font-semibold">{{ row.quantity_on_hand }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const items = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' },
  { key: 'warehouse.name', label: 'Warehouse' },
  { key: 'quantity_on_hand', label: 'On Hand' },
  { key: 'reorder_point', label: 'Reorder Point' },
  { key: 'reorder_quantity', label: 'Reorder Qty' },
]
onMounted(async () => {
  try { items.value = await request<any[]>('/inventory/reorder-alerts') }
  finally { loading.value = false }
})
</script>
