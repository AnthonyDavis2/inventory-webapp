<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-1">Create your account</h1>
      <p class="text-sm text-gray-500 mb-6">Start your 14-day free trial. No credit card required.</p>

      <UAlert v-if="error" color="red" :description="error" class="mb-4" />

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-2 gap-3">
          <UFormGroup label="First name">
            <UInput v-model="form.first_name" placeholder="Jane" required />
          </UFormGroup>
          <UFormGroup label="Last name">
            <UInput v-model="form.last_name" placeholder="Smith" required />
          </UFormGroup>
        </div>

        <UFormGroup label="Work email">
          <UInput v-model="form.email" type="email" placeholder="jane@company.com" required />
        </UFormGroup>

        <UFormGroup label="Password">
          <UInput v-model="form.password" type="password" placeholder="Min 8 characters" required minlength="8" />
        </UFormGroup>

        <UFormGroup label="Company name">
          <UInput v-model="form.org_name" placeholder="Acme Manufacturing LLC" required />
        </UFormGroup>

        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Create account
        </UButton>
      </form>

      <p class="mt-6 text-sm text-center text-gray-500">
        Already have an account?
        <NuxtLink to="/login" class="text-indigo-600 hover:underline">Sign in</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const auth = useAuthStore()
const { request } = useApi()

const form = reactive({ first_name: '', last_name: '', email: '', password: '', org_name: '' })
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    const data = await request<{ access_token: string; user: any; onboarding_complete: boolean }>(
      '/organizations',
      { method: 'POST', body: form },
    )
    auth.setAuth(data.access_token, data.user, data.onboarding_complete)
    await navigateTo('/onboarding/1')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Something went wrong'
  }
  finally {
    loading.value = false
  }
}
</script>
