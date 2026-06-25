<template>
  <div>
    <PageHeader title="Shipments" />
    <DataTable :columns="columns" :rows="shipments" :loading="loading">
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleDateString() }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const shipments = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'Date' }, { key: 'so.so_number', label: 'SO #' },
  { key: 'so.customer.name', label: 'Customer' }, { key: 'tracking_number', label: 'Tracking' }, { key: 'carrier', label: 'Carrier' },
]
onMounted(async () => {
  try { shipments.value = await request<any[]>('/sales/shipments') }
  finally { loading.value = false }
})
</script>
