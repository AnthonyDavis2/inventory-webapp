<template>
  <div class="max-w-xl">
    <PageHeader title="My Profile" />
    <UAlert v-if="saved" color="green" description="Saved." class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="First Name"><UInput v-model="form.first_name" /></UFormGroup>
        <UFormGroup label="Last Name"><UInput v-model="form.last_name" /></UFormGroup>
      </div>
      <div class="border-t border-gray-100 pt-4">
        <h3 class="text-sm font-semibold mb-3">Change Password</h3>
        <UFormGroup label="Current Password"><UInput v-model="form.current_password" type="password" /></UFormGroup>
        <UFormGroup label="New Password" class="mt-3"><UInput v-model="form.new_password" type="password" /></UFormGroup>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save Changes</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const auth = useAuthStore()
const form = reactive({
  first_name: auth.user?.first_name ?? '',
  last_name: auth.user?.last_name ?? '',
  current_password: '',
  new_password: '',
})
const saving = ref(false)
const saved = ref(false)
async function save() {
  saving.value = true; saved.value = false
  try {
    await request(`/users/${auth.user?.id}`, { method: 'PATCH', body: { first_name: form.first_name, last_name: form.last_name } })
    if (form.new_password) {
      await request('/auth/change-password', { method: 'POST', body: { current_password: form.current_password, new_password: form.new_password } })
      form.current_password = ''; form.new_password = ''
    }
    saved.value = true
  }
  finally { saving.value = false }
}
</script>
