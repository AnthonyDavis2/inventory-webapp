<template>
  <div class="max-w-2xl">
    <PageHeader title="Organization Profile" />
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <UAlert v-if="saved" color="green" description="Saved successfully" class="mb-4" />
    <div v-if="!loading" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Company Name"><UInput v-model="form.name" /></UFormGroup>
      <UFormGroup label="Business Email"><UInput v-model="form.email" type="email" /></UFormGroup>
      <UFormGroup label="Phone"><UInput v-model="form.phone" /></UFormGroup>
      <UFormGroup label="Website"><UInput v-model="form.website" /></UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save Changes</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const form = reactive({ name: '', email: '', phone: '', website: '' })
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)
onMounted(async () => {
  try { const org = await request<any>('/organizations/me'); Object.assign(form, { name: org.name, email: org.email ?? '', phone: org.phone ?? '', website: org.website ?? '' }) }
  finally { loading.value = false }
})
async function save() {
  saving.value = true; error.value = ''; saved.value = false
  try { await request('/organizations/me', { method: 'PATCH', body: form }); saved.value = true }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { saving.value = false }
}
</script>
