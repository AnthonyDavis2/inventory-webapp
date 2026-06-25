<template>
  <div>
    <PageHeader title="Bills of Materials">
      <template #actions>
        <UButton to="/app/manufacturing/boms/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New BOM</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="boms" :loading="loading">
      <template #name="{ row }">
        <NuxtLink :to="`/app/manufacturing/boms/${row.id}`" class="text-indigo-600 hover:underline font-medium">{{ row.name }}</NuxtLink>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const boms = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'name', label: 'Name' }, { key: 'product.sku', label: 'SKU' },
  { key: 'product.name', label: 'Product' }, { key: 'active_version.version_number', label: 'Version' },
]
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/manufacturing/boms'); boms.value = (data as any).data ?? data }
  finally { loading.value = false }
})
</script>
