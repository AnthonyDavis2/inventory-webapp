<template>
  <div>
    <PageHeader title="Cycle Counts">
      <template #actions>
        <UButton to="/app/inventory/cycle-counts/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Count</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="counts" :loading="loading">
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleDateString() }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const counts = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'Date' },
  { key: 'warehouse.name', label: 'Warehouse' },
  { key: 'status', label: 'Status' },
  { key: 'counted_at', label: 'Counted At' },
]
onMounted(async () => {
  try { counts.value = await request<any[]>('/inventory/cycle-counts') }
  finally { loading.value = false }
})
</script>
