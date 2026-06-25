<template>
  <div>
    <PageHeader title="Purchase History by Vendor" />
    <DataTable :columns="columns" :rows="rows" :loading="loading">
      <template #total_spend_cents="{ row }">{{ formatCurrency(Number(row.total_spend_cents)) }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const rows = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'vendor_name', label: 'Vendor' }, { key: 'order_count', label: 'Orders' }, { key: 'total_spend_cents', label: 'Total Spend' },
]
onMounted(async () => {
  try { rows.value = await request<any[]>('/reporting/purchase-history') }
  finally { loading.value = false }
})
</script>
