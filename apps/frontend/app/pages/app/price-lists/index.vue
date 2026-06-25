<template>
  <div>
    <PageHeader title="Price Lists">
      <template #actions>
        <UButton to="/app/price-lists/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Price List</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="lists" :loading="loading">
      <template #name="{ row }">
        <NuxtLink :to="`/app/price-lists/${row.id}`" class="text-indigo-600 hover:underline font-medium">{{ row.name }}</NuxtLink>
      </template>
      <template #is_default="{ row }">
        <UBadge v-if="row.is_default" label="Default" color="green" variant="soft" />
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const lists = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'currency', label: 'Currency' },
  { key: 'is_default', label: '' },
]
onMounted(async () => {
  try { lists.value = await request<any[]>('/price-lists') }
  finally { loading.value = false }
})
</script>
