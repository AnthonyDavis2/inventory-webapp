<template>
  <div>
    <PageHeader title="Warehouses">
      <template #actions>
        <UButton to="/app/warehouses/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Warehouse</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="warehouses" :loading="loading">
      <template #name="{ row }">
        <NuxtLink :to="`/app/warehouses/${row.id}`" class="text-indigo-600 hover:underline font-medium">{{ row.name }}</NuxtLink>
      </template>
      <template #is_default="{ row }">
        <UBadge v-if="row.is_default" label="Default" color="green" variant="soft" />
      </template>
      <template #bins_enabled="{ row }">
        {{ row.bins_enabled ? 'Yes' : 'No' }}
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const warehouses = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'is_default', label: 'Default' },
  { key: 'bins_enabled', label: 'Bin Locations' },
]
onMounted(async () => {
  try {
    const data = await request<{ data: any[] }>('/warehouses')
    warehouses.value = (data as any).data ?? data
  }
  finally { loading.value = false }
})
</script>
