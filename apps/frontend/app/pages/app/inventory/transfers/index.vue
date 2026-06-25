<template>
  <div>
    <PageHeader title="Inventory Transfers">
      <template #actions>
        <UButton to="/app/inventory/transfers/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Transfer</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="transfers" :loading="loading">
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleDateString() }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const transfers = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'Date' },
  { key: 'reference_number', label: 'Reference' },
  { key: 'from_warehouse.name', label: 'From' },
  { key: 'to_warehouse.name', label: 'To' },
  { key: 'notes', label: 'Notes' },
]
onMounted(async () => {
  try { transfers.value = await request<any[]>('/inventory/transfers') }
  finally { loading.value = false }
})
</script>
