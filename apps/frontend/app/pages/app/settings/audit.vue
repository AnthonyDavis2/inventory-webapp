<template>
  <div>
    <PageHeader title="Audit Log" />
    <DataTable :columns="columns" :rows="entries" :loading="loading">
      <template #created_at="{ row }">{{ new Date(row.created_at).toLocaleString() }}</template>
    </DataTable>
    <Pagination v-model:page="page" :total="total" :per-page="perPage" @change="fetchAudit" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const entries = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const perPage = 50
const loading = ref(true)
const columns = [
  { key: 'created_at', label: 'When' }, { key: 'user.email', label: 'User' },
  { key: 'action', label: 'Action' }, { key: 'entity_type', label: 'Entity' }, { key: 'entity_id', label: 'ID' },
]
async function fetchAudit() {
  loading.value = true
  try {
    const data = await request<{ data: any[]; total: number }>('/audit', { query: { page: page.value, limit: perPage } })
    entries.value = (data as any).data ?? data; total.value = (data as any).total ?? entries.value.length
  }
  finally { loading.value = false }
}
onMounted(fetchAudit)
</script>
