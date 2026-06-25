<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-1">Two-factor authentication</h1>
      <p class="text-sm text-gray-500 mb-6">Enter the 6-digit code from your authenticator app.</p>

      <UAlert v-if="error" color="red" :description="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <UFormGroup label="Code">
          <UInput
            v-model="code"
            placeholder="000000"
            maxlength="6"
            inputmode="numeric"
            pattern="[0-9]{6}"
            required
          />
        </UFormGroup>
        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Verify
        </UButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const auth = useAuthStore()
const { request } = useApi()
const code = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const data = await request<{ access_token: string; user: any; onboarding_complete: boolean }>(
      '/auth/mfa/verify',
      { method: 'POST', body: { token: code.value } },
    )
    auth.setAuth(data.access_token, data.user, data.onboarding_complete)
    await navigateTo(data.onboarding_complete ? '/app/dashboard' : '/onboarding/1')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Invalid code'
  }
  finally {
    loading.value = false
  }
}
</script>
