<template>
  <div class="max-w-xl">
    <PageHeader title="Edit Sales Order">
      <template #actions>
        <UButton :to="`/app/sales/orders/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Payment Terms">
        <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="3" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const form = reactive({ payment_terms: '', notes: '' })
const loading = ref(true)
const saving = ref(false)
const paymentTerms = [{ label: 'Net 30', value: 'NET30' }, { label: 'Net 60', value: 'NET60' }, { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' }]
onMounted(async () => {
  try { const so = await request<any>(`/sales/orders/${route.params.id}`); Object.assign(form, { payment_terms: so.payment_terms, notes: so.notes ?? '' }) }
  finally { loading.value = false }
})
async function save() {
  saving.value = true
  try {
    await request(`/sales/orders/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/sales/orders/${route.params.id}`)
  }
  finally { saving.value = false }
}
</script>
