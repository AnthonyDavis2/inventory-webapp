<template>
  <div class="max-w-2xl">
    <PageHeader title="Edit Purchase Order">
      <template #actions>
        <UButton :to="`/app/purchasing/orders/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Expected Delivery">
          <UInput v-model="form.expected_delivery" type="date" />
        </UFormGroup>
        <UFormGroup label="Payment Terms">
          <USelect v-model="form.payment_terms" :options="paymentTerms" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <UFormGroup label="Notes">
        <UTextarea v-model="form.notes" :rows="3" />
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
const form = reactive({ expected_delivery: '', payment_terms: '', notes: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const paymentTerms = [
  { label: 'Net 30', value: 'NET30' }, { label: 'Net 60', value: 'NET60' },
  { label: 'Net 15', value: 'NET15' }, { label: 'Due on Receipt', value: 'DUE_ON_RECEIPT' },
]
onMounted(async () => {
  try {
    const po = await request<any>(`/purchasing/orders/${route.params.id}`)
    Object.assign(form, { expected_delivery: po.expected_delivery?.split('T')[0] ?? '', payment_terms: po.payment_terms, notes: po.notes ?? '' })
  }
  finally { loading.value = false }
})
async function save() {
  saving.value = true; error.value = ''
  try {
    await request(`/purchasing/orders/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/purchasing/orders/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { saving.value = false }
}
</script>
