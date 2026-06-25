<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 class="text-2xl font-semibold text-gray-950 mb-1">Reset your password</h1>
      <p class="text-sm text-gray-500 mb-6">We'll send a reset link to your email.</p>

      <UAlert v-if="sent" color="green" description="Check your email for a reset link." class="mb-4" />
      <UAlert v-else-if="error" color="red" :description="error" class="mb-4" />

      <form v-if="!sent" class="space-y-4" @submit.prevent="onSubmit">
        <UFormGroup label="Email">
          <UInput v-model="email" type="email" placeholder="you@company.com" required />
        </UFormGroup>
        <UButton type="submit" block :loading="loading" class="bg-indigo-600 hover:bg-indigo-700">
          Send reset link
        </UButton>
      </form>

      <NuxtLink to="/login" class="mt-4 block text-sm text-center text-indigo-600 hover:underline">
        Back to sign in
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

const { request } = useApi()
const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await request('/auth/forgot-password', { method: 'POST', body: { email: email.value } })
    sent.value = true
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Something went wrong'
  }
  finally {
    loading.value = false
  }
}
</script>
