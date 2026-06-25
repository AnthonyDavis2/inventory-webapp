<template>
  <div class="max-w-2xl">
    <PageHeader title="New Customer">
      <template #actions>
        <UButton to="/app/customers" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Customer Name" required>
          <UInput v-model="form.name" />
        </UFormGroup>
        <UFormGroup label="Code" required>
          <UInput v-model="form.code" />
        </UFormGroup>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Email">
          <UInput v-model="form.email" type="email" />
        </UFormGroup>
        <UFormGroup label="Phone">
          <UInput v-model="form.phone" />
        </UFormGroup>
      </div>
      <UFormGroup label="Payment Terms">
        <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Credit Limit ($)">
          <UInput v-model="form.credit_limit" type="number" step="0.01" min="0" placeholder="0.00" />
        </UFormGroup>
        <UFormGroup label="Tax Exempt?">
          <USelect v-model="form.tax_exempt" :options="[{ label: 'No', value: 'false' }, { label: 'Yes', value: 'true' }]" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Customer</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ name: '', code: '', email: '', phone: '', payment_terms: 'NET30', credit_limit: '', tax_exempt: 'false' })
const loading = ref(false)
const error = ref('')
const paymentTerms = [
  { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' }, { label: 'Net 15', value: 'NET15' },
  { label: 'Net 30', value: 'NET30' }, { label: 'Net 60', value: 'NET60' }, { label: 'Net 90', value: 'NET90' },
]
async function save() {
  loading.value = true; error.value = ''
  try {
    const c = await request<any>('/customers', {
      method: 'POST',
      body: {
        ...form,
        tax_exempt: form.tax_exempt === 'true',
        credit_limit_cents: form.credit_limit ? dollarsToCents(Number(form.credit_limit)) : undefined,
      },
    })
    await router.push(`/app/customers/${c.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed to create customer' }
  finally { loading.value = false }
}
</script>
