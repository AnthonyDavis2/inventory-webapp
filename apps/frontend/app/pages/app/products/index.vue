<template>
  <div>
    <PageHeader title="Products">
      <template #actions>
        <UButton to="/app/products/import" variant="outline" size="sm">Import CSV</UButton>
        <UButton to="/app/products/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Product</UButton>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="flex gap-3 mb-4">
      <UInput v-model="search" placeholder="Search products…" class="max-w-xs" @input="debouncedFetch" />
      <USelect v-model="typeFilter" :options="typeOptions" option-attribute="label" value-attribute="value" placeholder="All types" class="w-40" @change="fetchProducts" />
    </div>

    <DataTable :columns="columns" :rows="products" :loading="loading">
      <template #sku="{ row }">
        <NuxtLink :to="`/app/products/${row.id}`" class="text-indigo-600 hover:underline font-mono text-sm">{{ row.sku }}</NuxtLink>
      </template>
      <template #name="{ row }">
        <span class="font-medium text-gray-900">{{ row.name }}</span>
      </template>
      <template #type="{ row }">
        <UBadge :label="row.type" variant="soft" />
      </template>
      <template #status="{ row }">
        <UBadge :label="row.status" :color="row.status === 'ACTIVE' ? 'green' : 'gray'" variant="soft" />
      </template>
      <template #actions="{ row }">
        <UButton :to="`/app/products/${row.id}/edit`" variant="ghost" size="xs" icon="i-heroicons-pencil" />
      </template>
    </DataTable>

    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchProducts" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const search = ref('')
const typeFilter = ref('')
const page = ref(1)
const perPage = 25
const products = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

const typeOptions = [
  { label: 'All types', value: '' },
  { label: 'Finished Good', value: 'FINISHED_GOOD' },
  { label: 'Raw Material', value: 'RAW_MATERIAL' },
  { label: 'Semi-Finished', value: 'SEMI_FINISHED' },
  { label: 'Service', value: 'SERVICE' },
]

const columns = [
  { key: 'sku', label: 'SKU' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'category.name', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '' },
]

async function fetchProducts() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/products', {
      query: { q: search.value, type: typeFilter.value, page: page.value, limit: perPage },
    })
    products.value = data.data
    total.value = data.total
  }
  finally { loading.value = false }
}

const debouncedFetch = useDebounceFn(fetchProducts, 300)
onMounted(fetchProducts)
</script>
