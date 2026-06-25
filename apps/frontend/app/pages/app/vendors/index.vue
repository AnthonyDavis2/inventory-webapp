<template>
  <div>
    <PageHeader title="Vendors">
      <template #actions>
        <UButton to="/app/vendors/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Vendor</UButton>
      </template>
    </PageHeader>
    <div class="flex gap-3 mb-4">
      <UInput v-model="search" placeholder="Search vendors…" class="max-w-xs" @input="debouncedFetch" />
    </div>
    <DataTable :columns="columns" :rows="vendors" :loading="loading">
      <template #name="{ row }">
        <NuxtLink :to="`/app/vendors/${row.id}`" class="text-indigo-600 hover:underline font-medium">{{ row.name }}</NuxtLink>
      </template>
      <template #status="{ row }">
        <UBadge :label="row.status" :color="row.status === 'ACTIVE' ? 'green' : 'gray'" variant="soft" />
      </template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchVendors" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const vendors = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 25
const search = ref('')
const loading = ref(true)
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
]
async function fetchVendors() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/vendors', { query: { q: search.value, page: page.value, limit: perPage } })
    vendors.value = (data as any).data ?? data
    total.value = (data as any).total ?? vendors.value.length
  }
  finally { loading.value = false }
}
const debouncedFetch = useDebounceFn(fetchVendors, 300)
onMounted(fetchVendors)
</script>
