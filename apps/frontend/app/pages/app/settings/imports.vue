<template>
  <div>
    <PageHeader title="Import History" />
    <DataTable :columns="columns" :rows="imports" :loading="loading">
      <template #status="{ row }">
        <UBadge :label="row.status" :color="row.status === 'COMPLETED' ? 'green' : row.status === 'FAILED' ? 'red' : 'gray'" variant="soft" />
      </template>
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleDateString() }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const imports = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'Date' }, { key: 'entity_type', label: 'Type' },
  { key: 'status', label: 'Status' }, { key: 'row_count', label: 'Rows' }, { key: 'error_count', label: 'Errors' },
]
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/imports'); imports.value = (data as any).data ?? data }
  finally { loading.value = false }
})
</script>
