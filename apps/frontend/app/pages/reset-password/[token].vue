<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-6">Set new password</h1>

      <UAlert v-if="error" color="red" :description="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormGroup label="New password">
          <UInput v-model="password" type="password" placeholder="Min 8 characters" required minlength="8" />
        </UFormGroup>
        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Reset password
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const { request } = useApi()
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await request('/auth/reset-password', {
      method: 'POST',
      body: { token: route.params.token, password: password.value },
    })
    await navigateTo('/login')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Invalid or expired reset link'
  }
  finally {
    loading.value = false
  }
}
</script>
