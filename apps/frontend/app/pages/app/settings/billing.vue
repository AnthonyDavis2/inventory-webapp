<template>
  <div class="max-w-xl">
    <PageHeader title="Billing" />
    <div v-if="subscription" class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <InfoCard title="Current Plan">
        <InfoRow label="Plan" :value="subscription.plan" />
        <InfoRow label="Status" :value="subscription.status" />
        <InfoRow label="Trial Ends" :value="subscription.trial_end ? new Date(subscription.trial_end).toLocaleDateString() : undefined" />
      </InfoCard>
      <div class="flex gap-3">
        <UButton :loading="checkingOut" class="bg-indigo-600 hover:bg-indigo-700" @click="checkout">Upgrade Plan</UButton>
        <UButton variant="outline" :loading="openingPortal" @click="openPortal">Manage Billing</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const subscription = ref<any>(null)
const checkingOut = ref(false)
const openingPortal = ref(false)
onMounted(async () => { subscription.value = await request<any>('/billing/subscription').catch(() => null) })
async function checkout() {
  checkingOut.value = true
  try {
    const { url } = await request<{ url: string }>('/billing/checkout', { method: 'POST', body: { return_url: window.location.href } })
    window.location.href = url
  }
  finally { checkingOut.value = false }
}
async function openPortal() {
  openingPortal.value = true
  try {
    const { url } = await request<{ url: string }>('/billing/portal', { method: 'POST', body: { return_url: window.location.href } })
    window.location.href = url
  }
  finally { openingPortal.value = false }
}
</script>
