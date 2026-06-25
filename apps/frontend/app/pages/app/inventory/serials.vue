<template>
  <div>
    <PageHeader title="Serial Numbers" />
    <div class="flex gap-3 mb-4">
      <UInput v-model="search" placeholder="Search serial #…" class="max-w-xs" @input="debouncedFetch" />
    </div>
    <DataTable :columns="columns" :rows="serials" :loading="loading">
      <template #status="{ row }"><UBadge :label="row.status" variant="soft" /></template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const serials = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const columns = [
  { key: 'serial_number', label: 'Serial #' },
  { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' },
  { key: 'status', label: 'Status' },
  { key: 'warehouse.name', label: 'Location' },
]
async function fetchSerials() {
  loading.value = true
  try { serials.value = await request<any[]>('/inventory/serials', { query: { q: search.value } }) }
  finally { loading.value = false }
}
const debouncedFetch = useDebounceFn(fetchSerials, 300)
onMounted(fetchSerials)
</script>
