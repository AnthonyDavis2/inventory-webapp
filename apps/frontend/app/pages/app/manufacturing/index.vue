<template>
  <div>
    <PageHeader title="Manufacturing">
      <template #actions>
        <UButton to="/app/manufacturing/boms/new" variant="outline" size="sm">+ New BOM</UButton>
        <UButton to="/app/manufacturing/work-orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Work Order</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-2 gap-4 mb-6">
      <NuxtLink to="/app/manufacturing/boms" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon name="i-heroicons-document-duplicate" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium">Bills of Materials</p>
      </NuxtLink>
      <NuxtLink to="/app/manufacturing/work-orders" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium">Work Orders</p>
      </NuxtLink>
    </div>
    <DataTable :columns="columns" :rows="workOrders" :loading="loading">
      <template #wo_number="{ row }">
        <NuxtLink :to="`/app/manufacturing/work-orders/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.wo_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const workOrders = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'wo_number', label: 'WO #' }, { key: 'product.name', label: 'Product' },
  { key: 'status', label: 'Status' }, { key: 'quantity_planned', label: 'Qty Planned' }, { key: 'quantity_produced', label: 'Qty Produced' },
]
onMounted(async () => {
  try {
    const data = await request<{ data: any[] }>('/manufacturing/work-orders', { query: { limit: 10 } })
    workOrders.value = (data as any).data ?? data
  }
  finally { loading.value = false }
})
</script>
