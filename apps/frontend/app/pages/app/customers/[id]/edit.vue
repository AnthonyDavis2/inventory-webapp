<template>
  <div class="max-w-2xl">
    <PageHeader title="Edit Customer">
      <template #actions>
        <UButton :to="`/app/customers/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Name"><UInput v-model="form.name" /></UFormGroup>
        <UFormGroup label="Code"><UInput v-model="form.code" /></UFormGroup>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Email"><UInput v-model="form.email" type="email" /></UFormGroup>
        <UFormGroup label="Phone"><UInput v-model="form.phone" /></UFormGroup>
      </div>
      <UFormGroup label="Payment Terms">
        <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Status">
        <USelect v-model="form.status" :options="[{ label: 'Active', value: 'ACTIVE' }, { label: 'Inactive', value: 'INACTIVE' }, { label: 'On Hold', value: 'ON_HOLD' }]" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save Changes</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const form = reactive({ name: '', code: '', email: '', phone: '', payment_terms: '', status: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const paymentTerms = [
  { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' }, { label: 'Net 15', value: 'NET15' },
  { label: 'Net 30', value: 'NET30' }, { label: 'Net 60', value: 'NET60' },
]
onMounted(async () => {
  try {
    const c = await request<any>(`/customers/${route.params.id}`)
    Object.assign(form, { name: c.name, code: c.code, email: c.email ?? '', phone: c.phone ?? '', payment_terms: c.payment_terms, status: c.status })
  }
  finally { loading.value = false }
})
async function save() {
  saving.value = true; error.value = ''
  try {
    await request(`/customers/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/customers/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { saving.value = false }
}
</script>
