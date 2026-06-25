<template>
  <div class="max-w-xl">
    <PageHeader title="Edit BOM">
      <template #actions>
        <UButton :to="`/app/manufacturing/boms/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Name"><UInput v-model="form.name" /></UFormGroup>
      <UFormGroup label="Description"><UTextarea v-model="form.description" :rows="3" /></UFormGroup>
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
const form = reactive({ name: '', description: '' })
const loading = ref(true)
const saving = ref(false)
onMounted(async () => {
  try { const b = await request<any>(`/manufacturing/boms/${route.params.id}`); Object.assign(form, { name: b.name, description: b.description ?? '' }) }
  finally { loading.value = false }
})
async function save() {
  saving.value = true
  try {
    await request(`/manufacturing/boms/${route.params.id}`, { method: 'PATCH', body: form })
    await router.push(`/app/manufacturing/boms/${route.params.id}`)
  }
  finally { saving.value = false }
}
</script>
