<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-1">Sign in</h1>
      <p class="text-sm text-gray-500 mb-6">Welcome back to Inventory</p>

      <UAlert v-if="error" color="red" :description="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormGroup label="Email">
          <UInput v-model="form.email" type="email" placeholder="you@company.com" required />
        </UFormGroup>

        <UFormGroup label="Password">
          <UInput v-model="form.password" type="password" placeholder="••••••••" required />
        </UFormGroup>

        <div class="flex justify-end">
          <NuxtLink to="/forgot-password" class="text-sm text-indigo-600 hover:underline">Forgot password?</NuxtLink>
        </div>

        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Sign in
        </UButton>
      </form>

      <p class="mt-6 text-sm text-center text-gray-500">
        Don't have an account?
        <NuxtLink to="/register" class="text-indigo-600 hover:underline">Create one</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const auth = useAuthStore()
const { request } = useApi()

const form = reactive({ email: '', password: '' })
const loading = ref(false)
const error = ref('')
const mfaRequired = ref(false)

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const data = await request<{ access_token: string; mfa_required?: boolean; user: any; onboarding_complete: boolean }>(
      '/auth/login',
      { method: 'POST', body: form },
    )
    if (data.mfa_required) {
      await navigateTo('/verify-mfa')
      return
    }
    auth.setAuth(data.access_token, data.user, data.onboarding_complete)
    await navigateTo(data.onboarding_complete ? '/app/dashboard' : '/onboarding/1')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Invalid email or password'
  }
  finally {
    loading.value = false
  }
}
</script>
