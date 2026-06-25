<template>
  <div>
    <PageHeader title="Expenses">
      <template #actions>
        <UButton to="/app/expenses/categories" variant="outline" size="sm">Categories</UButton>
        <UButton to="/app/expenses/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Expense</UButton>
      </template>
    </PageHeader>
    <DataTable :columns="columns" :rows="expenses" :loading="loading">
      <template #description="{ row }">
        <NuxtLink :to="`/app/expenses/${row.id}`" class="text-indigo-600 hover:underline">{{ row.description }}</NuxtLink>
      </template>
      <template #amount_cents="{ row }">{{ formatCurrency(row.amount_cents) }}</template>
      <template #expense_date="{ row }">{{ new Date(row.expense_date).toLocaleDateString() }}</template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const expenses = ref<any[]>([])
const loading = ref(true)
const columns = [
  { key: 'expense_date', label: 'Date' }, { key: 'description', label: 'Description' },
  { key: 'category.name', label: 'Category' }, { key: 'amount_cents', label: 'Amount' },
]
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/expenses'); expenses.value = (data as any).data ?? data }
  finally { loading.value = false }
})
</script>
