<template>
  <div>
    <PageHeader title="Customers">
      <template #actions>
        <UButton to="/app/customers/groups" variant="outline" size="sm">Groups</UButton>
        <UButton to="/app/customers/import" variant="outline" size="sm">Import</UButton>
        <UButton to="/app/customers/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Customer</UButton>
      </template>
    </PageHeader>
    <div class="flex gap-3 mb-4">
      <UInput v-model="search" placeholder="Search customers…" class="max-w-xs" @input="debouncedFetch" />
    </div>
    <DataTable :columns="columns" :rows="customers" :loading="loading">
      <template #name="{ row }">
        <NuxtLink :to="`/app/customers/${row.id}`" class="text-indigo-600 hover:underline font-medium">{{ row.name }}</NuxtLink>
      </template>
      <template #status="{ row }">
        <UBadge :label="row.status" :color="row.status === 'ACTIVE' ? 'green' : 'gray'" variant="soft" />
      </template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchCustomers" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const customers = ref<any[]>([])
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
async function fetchCustomers() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/customers', { query: { q: search.value, page: page.value, limit: perPage } })
    customers.value = (data as any).data ?? data
    total.value = (data as any).total ?? customers.value.length
  }
  finally { loading.value = false }
}
const debouncedFetch = useDebounceFn(fetchCustomers, 300)
onMounted(fetchCustomers)
</script>
