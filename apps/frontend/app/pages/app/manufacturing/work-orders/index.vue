<template>
  <div>
    <PageHeader title="Work Orders">
      <template #actions>
        <UButton to="/app/manufacturing/work-orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Work Order</UButton>
      </template>
    </PageHeader>
    <div class="flex gap-3 mb-4">
      <USelect v-model="statusFilter" :options="statusOptions" option-attribute="label" value-attribute="value" class="w-44" @change="fetchWOs" />
    </div>
    <DataTable :columns="columns" :rows="workOrders" :loading="loading">
      <template #wo_number="{ row }">
        <NuxtLink :to="`/app/manufacturing/work-orders/${row.id}`" class="text-indigo-600 hover:underline font-mono">{{ row.wo_number }}</NuxtLink>
      </template>
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchWOs" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const workOrders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 25
const loading = ref(true)
const statusFilter = ref('')
const statusOptions = [
  { label: 'All', value: '' }, { label: 'Draft', value: 'DRAFT' }, { label: 'Released', value: 'RELEASED' },
  { label: 'In Progress', value: 'IN_PROGRESS' }, { label: 'Completed', value: 'COMPLETED' },
]
const columns = [
  { key: 'wo_number', label: 'WO #' }, { key: 'product.name', label: 'Product' },
  { key: 'status', label: 'Status' }, { key: 'quantity_planned', label: 'Planned' }, { key: 'quantity_produced', label: 'Produced' },
]
async function fetchWOs() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/manufacturing/work-orders', { query: { status: statusFilter.value, page: page.value, limit: perPage } })
    workOrders.value = (data as any).data ?? data; total.value = (data as any).total ?? workOrders.value.length
  }
  finally { loading.value = false }
}
onMounted(fetchWOs)
</script>
