<template>
  <div class="max-w-2xl">
    <PageHeader title="New Invoice">
      <template #actions>
        <UButton to="/app/invoices" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Customer" required>
        <USelect v-model="form.customer_id" :options="customers" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Due Date">
        <UInput v-model="form.due_date" type="date" />
      </UFormGroup>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="2" />
      </UFormGroup>
      <div class="border-t border-gray-100 pt-4">
        <h3 class="text-sm font-semibold mb-3">Lines</h3>
        <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-3 gap-3 mb-3 items-end">
          <UFormGroup label="Description" class="col-span-1">
            <UInput v-model="line.description" placeholder="Line item description" />
          </UFormGroup>
          <UFormGroup label="Qty">
            <UInput v-model="line.quantity" type="number" min="0.0001" step="any" />
          </UFormGroup>
          <UFormGroup label="Unit Price ($)">
            <UInput v-model="line.unit_price" type="number" step="0.01" min="0" />
          </UFormGroup>
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="form.lines.push({ description: '', quantity: '1', unit_price: '' })">+ Add line</button>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Invoice</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ customer_id: '', due_date: '', notes: '', lines: [{ description: '', quantity: '1', unit_price: '' }] })
const loading = ref(false)
const error = ref('')
const customers = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const c = await request<{ data: any[] }>('/customers').catch(() => ({ data: [] }))
  customers.value = (c as any).data.map((x: any) => ({ label: x.name, value: x.id }))
})
async function save() {
  loading.value = true; error.value = ''
  try {
    const inv = await request<any>('/invoices', {
      method: 'POST',
      body: {
        customer_id: form.customer_id,
        due_date: form.due_date || undefined,
        notes: form.notes,
        lines: form.lines.filter(l => l.description && l.quantity).map(l => ({
          description: l.description, quantity: Number(l.quantity),
          unit_price_cents: dollarsToCents(Number(l.unit_price)),
        })),
      },
    })
    await router.push(`/app/invoices/${inv.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
