<template>
  <div class="max-w-2xl">
    <PageHeader title="New Vendor">
      <template #actions>
        <UButton to="/app/vendors" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Vendor Name" required>
          <UInput v-model="form.name" placeholder="Acme Supplies Co." />
        </UFormGroup>
        <UFormGroup label="Code" required>
          <UInput v-model="form.code" placeholder="ACME" />
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
      <UFormGroup label="Website">
        <UInput v-model="form.website" placeholder="https://..." />
      </UFormGroup>
      <UFormGroup label="Payment Terms">
        <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="3" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Vendor</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ name: '', code: '', email: '', phone: '', website: '', payment_terms: 'NET30', notes: '' })
const loading = ref(false)
const error = ref('')
const paymentTerms = [
  { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' },
  { label: 'Net 15', value: 'NET15' },
  { label: 'Net 30', value: 'NET30' },
  { label: 'Net 60', value: 'NET60' },
  { label: 'Net 90', value: 'NET90' },
]
async function save() {
  loading.value = true; error.value = ''
  try {
    const v = await request<any>('/vendors', { method: 'POST', body: form })
    await router.push(`/app/vendors/${v.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed to create vendor' }
  finally { loading.value = false }
}
</script>
