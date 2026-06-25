<template>
  <div class="max-w-xl">
    <PageHeader title="New Expense">
      <template #actions>
        <UButton to="/app/expenses" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Category" required>
        <USelect v-model="form.category_id" :options="categories" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Description" required>
        <UInput v-model="form.description" placeholder="Office supplies, travel, etc." />
      </UFormGroup>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Amount ($)" required>
          <UInput v-model="form.amount" type="number" step="0.01" min="0.01" />
        </UFormGroup>
        <UFormGroup label="Date" required>
          <UInput v-model="form.expense_date" type="date" />
        </UFormGroup>
      </div>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="2" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save Expense</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '' })
const loading = ref(false)
const error = ref('')
const categories = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const cats = await request<any[]>('/expenses/categories').catch(() => [])
  categories.value = (cats as any).map((c: any) => ({ label: c.name, value: c.id }))
})
async function save() {
  loading.value = true; error.value = ''
  try {
    const exp = await request<any>('/expenses', {
      method: 'POST',
      body: { ...form, amount_cents: dollarsToCents(Number(form.amount)) },
    })
    await router.push(`/app/expenses/${exp.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
