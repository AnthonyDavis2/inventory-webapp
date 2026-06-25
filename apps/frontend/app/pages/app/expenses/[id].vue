<template>
  <div v-if="expense">
    <PageHeader :title="expense.description">
      <template #actions>
        <UButton to="/app/expenses" variant="outline" size="sm">← Back</UButton>
      </template>
    </PageHeader>
    <InfoCard title="Expense Details">
      <InfoRow label="Date" :value="new Date(expense.expense_date).toLocaleDateString()" />
      <InfoRow label="Category" :value="expense.category?.name" />
      <InfoRow label="Amount" :value="formatCurrency(expense.amount_cents)" />
      <InfoRow label="Notes" :value="expense.notes" />
    </InfoCard>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const expense = ref<any>(null)
onMounted(async () => { expense.value = await request<any>(`/expenses/${route.params.id}`) })
</script>
