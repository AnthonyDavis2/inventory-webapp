<template>
  <div>
    <PageHeader title="Lots & Batches" />
    <DataTable :columns="columns" :rows="lots" :loading="loading">
      <template #lot_number="{ row }">
        <NuxtLink :to="`/app/inventory/lots/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.lot_number }}</NuxtLink>
      </template>
      <template #expiry_date="{ row }">
        {{ row.expiry_date ? new Date(row.expiry_date).toLocaleDateString() : '—' }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const lots = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'lot_number', label: 'Lot #' },
  { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' },
  { key: 'quantity_on_hand', label: 'On Hand' },
  { key: 'expiry_date', label: 'Expiry' },
]
onMounted(async () => {
  try { lots.value = await request<any[]>('/inventory/lots') }
  finally { loading.value = false }
})
</script>
