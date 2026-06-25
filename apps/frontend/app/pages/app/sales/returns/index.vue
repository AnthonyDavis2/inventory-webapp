<template>
  <div>
    <PageHeader title="Return Authorizations">
      <template #actions>
        <UButton to="/app/sales/returns/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New RMA</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="rmas" :loading="loading">
      <template #rma_number="{ row }">
        <NuxtLink :to="`/app/sales/returns/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.rma_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const rmas = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'rma_number', label: 'RMA #' }, { key: 'so.so_number', label: 'SO #' },
  { key: 'customer.name', label: 'Customer' }, { key: 'status', label: 'Status' },
]
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/rmas'); rmas.value = (data as any).data ?? data }
  finally { loading.value = false }
})
</script>
