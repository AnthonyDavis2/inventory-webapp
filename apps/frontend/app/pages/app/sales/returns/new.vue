<template>
  <div class="max-w-2xl">
    <PageHeader title="New Return Authorization">
      <template #actions>
        <UButton to="/app/sales/returns" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Sales Order" required>
        <USelect v-model="form.so_id" :options="orders" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Reason">
        <UTextarea v-model="form.reason" :rows="3" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create RMA</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ so_id: '', reason: '' })
const loading = ref(false)
const error = ref('')
const orders = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const data = await request<{ data: any[] }>('/sales/orders', { query: { status: 'FULFILLED', limit: 100 } }).catch(() => ({ data: [] }))
  orders.value = (data as any).data.map((so: any) => ({ label: `${so.so_number} – ${so.customer?.name}`, value: so.id }))
})
async function save() {
  loading.value = true; error.value = ''
  try {
    const rma = await request<any>('/rmas', { method: 'POST', body: form })
    await router.push(`/app/sales/returns/${rma.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
