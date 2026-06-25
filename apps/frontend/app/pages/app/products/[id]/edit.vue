<template>
  <div class="max-w-2xl">
    <PageHeader :title="form.name || 'Edit Product'">
      <template #actions>
        <UButton :to="`/app/products/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>

    <UAlert v-if="error" color="red" :description="error" class="mb-4" />

    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="SKU">
          <UInput v-model="form.sku" />
        </UFormGroup>
        <UFormGroup label="Type">
          <USelect v-model="form.type" :options="typeOptions" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <UFormGroup label="Name">
        <UInput v-model="form.name" />
      </UFormGroup>
      <UFormGroup label="Description">
        <UTextarea v-model="form.description" :rows="3" />
      </UFormGroup>
      <UFormGroup label="Status">
        <USelect v-model="form.status" :options="statusOptions" option-attribute="label" value-attribute="value" />
      </UFormGroup>

      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">
          Save Changes
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { request } = useApi()

const form = reactive({ sku: '', type: '', name: '', description: '', status: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')

const typeOptions = [
  { label: 'Finished Good', value: 'FINISHED_GOOD' },
  { label: 'Raw Material', value: 'RAW_MATERIAL' },
  { label: 'Semi-Finished', value: 'SEMI_FINISHED' },
  { label: 'Service', value: 'SERVICE' },
]
const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Discontinued', value: 'DISCONTINUED' },
]

onMounted(async () => {
  try {
    const p = await request<any>(`/products/${route.params.id}`)
    Object.assign(form, { sku: p.sku, type: p.type, name: p.name, description: p.description ?? '', status: p.status })
  }
  finally { loading.value = false }
})

async function save() {
  saving.value = true
  error.value = ''
  try {
    await request(`/products/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/products/${route.params.id}`)
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to save'
  }
  finally { saving.value = false }
}
</script>
