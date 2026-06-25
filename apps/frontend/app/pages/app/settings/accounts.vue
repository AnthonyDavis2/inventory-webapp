<template>
  <div>
    <PageHeader title="Chart of Accounts" />
    <div class="space-y-3">
      <div v-for="group in accountGroups" :key="group.type" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button class="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50" @click="group.open = !group.open">
          <span>{{ group.type }}</span>
          <UIcon :name="group.open ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
        </button>
        <div v-if="group.open" class="divide-y divide-gray-100">
          <div v-for="acc in group.accounts" :key="acc.id" class="flex items-center justify-between px-5 py-2.5 text-sm">
            <div class="flex items-center gap-3">
              <span class="font-mono text-gray-500 text-xs w-12">{{ acc.code }}</span>
              <span class="text-gray-900">{{ acc.name }}</span>
              <UIcon v-if="acc.is_system" name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-gray-400" title="System account" />
            </div>
            <span class="text-xs text-gray-500">{{ acc.type }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const accountGroups = ref<any[]>([])
onMounted(async () => {
  const accounts = await request<any[]>('/accounting/accounts').catch(() => [])
  const groups: Record<string, any> = {}
  for (const acc of accounts) {
    if (!groups[acc.account_class]) groups[acc.account_class] = { type: acc.account_class, accounts: [], open: true }
    groups[acc.account_class].accounts.push(acc)
  }
  accountGroups.value = Object.values(groups)
})
</script>
