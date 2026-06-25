<template>
  <div class="max-w-xl">
    <PageHeader title="New Cycle Count">
      <template #actions>
        <UButton to="/app/inventory/cycle-counts" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <UFormGroup label="Warehouse" required>
        <USelect v-model="form.warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
      </UFormGroup>
      <UFormGroup label="Notes">
        <UInput v-model="form.notes" />
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="create">Create Count Sheet</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ warehouse_id: '', notes: '' })
const loading = ref(false)
const error = ref('')
const warehouses = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const wh = await request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] }))
  warehouses.value = (wh as any).data.map((w: any) => ({ label: w.name, value: w.id }))
})
async function create() {
  loading.value = true
  error.value = ''
  try {
    await request('/inventory/cycle-counts', { method: 'POST', body: form })
    await router.push('/app/inventory/cycle-counts')
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
