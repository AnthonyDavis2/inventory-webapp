<template>
  <div>
    <PageHeader title="Inventory Adjustments">
      <template #actions>
        <UButton to="/app/inventory/adjustments/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Adjustment</UButton>
      </template>
    </PageHeader>

    <DataTable :columns="columns" :rows="adjustments" :loading="loading">
      <template #adjustment_type="{ row }">
        <UBadge :label="row.adjustment_type" variant="soft" />
      </template>
      <template #created_at="{ row }">
        {{ new Date(row.created_at).toLocaleDateString() }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const adjustments = ref<any[]>([])
const loading = ref(true)

const columns = [
  { key: 'created_at', label: 'Date' },
  { key: 'adjustment_type', label: 'Type' },
  { key: 'reference_number', label: 'Reference' },
  { key: 'warehouse.name', label: 'Warehouse' },
  { key: 'notes', label: 'Notes' },
]

onMounted(async () => {
  try {
    adjustments.value = await request<any[]>('/inventory/adjustments')
  }
  finally { loading.value = false }
})
</script>
