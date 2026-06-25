<template>
  <div class="max-w-xl">
    <PageHeader title="Edit Warehouse">
      <template #actions>
        <UButton :to="`/app/warehouses/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Name">
        <UInput v-model="form.name" />
      </UFormGroup>
      <UFormGroup label="Code">
        <UInput v-model="form.code" />
      </UFormGroup>
      <UFormGroup label="Address">
        <UInput v-model="form.address" />
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
const form = reactive({ name: '', code: '', address: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')
onMounted(async () => {
  try {
    const wh = await request<any>(`/warehouses/${route.params.id}`)
    Object.assign(form, { name: wh.name, code: wh.code, address: wh.address ?? '' })
  }
  finally { loading.value = false }
})
async function save() {
  saving.value = true; error.value = ''
  try {
    await request(`/warehouses/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/warehouses/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed to save' }
  finally { saving.value = false }
}
</script>
