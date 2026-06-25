<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-1">Accept invitation</h1>
      <p class="text-sm text-gray-500 mb-6">Set a password to complete your account setup.</p>

      <UAlert v-if="error" color="red" :description="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <UFormGroup label="First name">
            <UInput v-model="form.first_name" required />
          </UFormGroup>
          <UFormGroup label="Last name">
            <UInput v-model="form.last_name" required />
          </UFormGroup>
        </div>
        <UFormGroup label="Password">
          <UInput v-model="form.password" type="password" placeholder="Min 8 characters" required minlength="8" />
        </UFormGroup>
        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Create account
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const route = useRoute()
const auth = useAuthStore()
const { request } = useApi()
const form = reactive({ first_name: '', last_name: '', password: '' })
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const data = await request<{ access_token: string; user: any; onboarding_complete: boolean }>(
      '/users/accept-invite',
      { method: 'POST', body: { token: route.params.token, ...form } },
    )
    auth.setAuth(data.access_token, data.user, data.onboarding_complete)
    await navigateTo('/app/dashboard')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Invalid or expired invitation'
  }
  finally {
    loading.value = false
  }
}
</script>
