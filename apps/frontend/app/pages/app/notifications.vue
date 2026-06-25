<template>
  <div>
    <PageHeader title="Notifications">
      <template #actions>
        <UButton v-if="notifications.some(n => !n.read_at)" variant="outline" size="sm" :loading="markingAll" @click="markAllRead">Mark all read</UButton>
      </template>
    </PageHeader>
    <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div v-if="loading" class="py-12 text-center"><UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" /></div>
      <div v-else-if="notifications.length === 0" class="py-12 text-center text-sm text-gray-400">No notifications</div>
      <div
        v-for="n in notifications"
        :key="n.id"
        class="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50"
        :class="!n.read_at ? 'bg-indigo-50/40' : ''"
        @click="markRead(n)"
      >
        <div class="w-2 h-2 mt-1.5 rounded-full shrink-0" :class="!n.read_at ? 'bg-indigo-500' : 'bg-transparent'" />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900">{{ n.title }}</p>
          <p class="text-sm text-gray-600 mt-0.5">{{ n.body }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ new Date(n.created_at).toLocaleString() }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const notifications = ref<any[]>([])
const loading = ref(true)
const markingAll = ref(false)
onMounted(async () => {
  try { const data = await request<{ data: any[] }>('/notifications'); notifications.value = (data as any).data ?? data }
  finally { loading.value = false }
})
async function markRead(n: any) {
  if (n.read_at) return
  await request(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})
  n.read_at = new Date().toISOString()
}
async function markAllRead() {
  markingAll.value = true
  try {
    await request('/notifications/mark-all-read', { method: 'PATCH' })
    notifications.value.forEach(n => { n.read_at = new Date().toISOString() })
  }
  finally { markingAll.value = false }
}
</script>
