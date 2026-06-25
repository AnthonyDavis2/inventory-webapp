<template>
  <div>
    <PageHeader title="Settings" />
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="item in settingsItems" :key="item.to" :to="item.to" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon :name="item.icon" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ item.desc }}</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const auth = useAuthStore()
const settingsItems = computed(() => [
  { to: '/app/settings/organization', icon: 'i-heroicons-building-office-2', label: 'Organization', desc: 'Company profile & branding' },
  { to: '/app/settings/users', icon: 'i-heroicons-users', label: 'Users', desc: 'Manage team members' },
  { to: '/app/settings/uom', icon: 'i-heroicons-scale', label: 'Units of Measure', desc: 'Custom units & conversions' },
  { to: '/app/settings/tax', icon: 'i-heroicons-receipt-percent', label: 'Tax Settings', desc: 'Sales tax configuration' },
  { to: '/app/settings/accounts', icon: 'i-heroicons-document-chart-bar', label: 'Chart of Accounts', desc: 'General ledger accounts' },
  { to: '/app/settings/imports', icon: 'i-heroicons-arrow-up-tray', label: 'Import History', desc: 'CSV import jobs & templates' },
  { to: '/app/settings/audit', icon: 'i-heroicons-shield-check', label: 'Audit Log', desc: 'System activity log' },
  { to: '/app/settings/profile', icon: 'i-heroicons-user-circle', label: 'My Profile', desc: 'Password & MFA settings' },
  { to: '/app/settings/notifications', icon: 'i-heroicons-bell', label: 'Notifications', desc: 'My notification preferences' },
  ...(auth.isOwner ? [{ to: '/app/settings/billing', icon: 'i-heroicons-credit-card', label: 'Billing', desc: 'Subscription & plan' }] : []),
])
</script>
