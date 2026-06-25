<template>
  <div class="max-w-3xl">
    <PageHeader :title="`Edit Quote ${quote?.quote_number ?? ''}`">
      <template #actions>
        <UButton :to="`/app/sales/quotes/${$route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="quote" class="space-y-4">
      <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormGroup label="Customer">
            <USelect v-model="form.customer_id" :options="customers" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Expiry Date">
            <UInput v-model="form.expires_at" type="date" />
          </UFormGroup>
        </div>
        <UFormGroup label="Notes"><UTextarea v-model="form.notes" :rows="2" /></UFormGroup>
      </div>
      <div class="flex justify-end">
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
const quote = ref<any>(null)
const customers = ref<{ label: string; value: string }[]>([])
const form = reactive({ customer_id: '', expires_at: '', notes: '' })
const saving = ref(false)
const error = ref('')
onMounted(async () => {
  const [q, cList] = await Promise.all([
    request<any>(`/sales/quotes/${route.params.id}`),
    request<{ data: any[] }>('/customers').catch(() => ({ data: [] })),
  ])
  quote.value = q
  Object.assign(form, {
    customer_id: q.customer_id,
    expires_at: q.expires_at ? q.expires_at.split('T')[0] : '',
    notes: q.notes ?? '',
  })
  customers.value = ((cList as any).data ?? cList).map((c: any) => ({ label: c.name, value: c.id }))
})
async function save() {
  saving.value = true; error.value = ''
  try {
    await request(`/sales/quotes/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/sales/quotes/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { saving.value = false }
}
</script>
