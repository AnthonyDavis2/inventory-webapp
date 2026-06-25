<template>
  <div class="max-w-3xl">
    <PageHeader title="Users">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showInvite = true">Invite User</UButton>
      </template>
    </PageHeader>

    <div v-if="showInvite" class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 class="text-sm font-semibold mb-3">Invite New User</h3>
      <div class="flex gap-3">
        <UInput v-model="invite.email" type="email" placeholder="Email" class="flex-1" />
        <USelect v-model="invite.role" :options="roles" option-attribute="label" value-attribute="value" class="w-40" />
        <UButton :loading="inviting" class="bg-indigo-600" @click="sendInvite">Send</UButton>
        <UButton variant="outline" @click="showInvite = false">Cancel</UButton>
      </div>
    </div>

    <DataTable :columns="columns" :rows="users" :loading="loading">
      <template #name="{ row }">
        <div>
          <p class="font-medium">{{ [row.first_name, row.last_name].filter(Boolean).join(' ') || '—' }}</p>
          <p class="text-xs text-gray-500">{{ row.email }}</p>
        </div>
      </template>
      <template #role="{ row }"><UBadge :label="row.role" variant="soft" /></template>
      <template #status="{ row }">
        <UBadge :label="row.status ?? 'ACTIVE'" :color="row.status === 'INACTIVE' ? 'gray' : 'green'" variant="soft" />
      </template>
      <template #actions="{ row }">
        <UButton v-if="row.id !== auth.user?.id" variant="ghost" size="xs" :label="row.status === 'INACTIVE' ? 'Reactivate' : 'Deactivate'" @click="toggleUser(row)" />
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const auth = useAuthStore()
const users = ref<any[]>([])
const loading = ref(true)
const showInvite = ref(false)
const invite = reactive({ email: '', role: 'WAREHOUSE' })
const inviting = ref(false)
const roles = [
  { label: 'Admin', value: 'ADMIN' }, { label: 'Sales', value: 'SALES' },
  { label: 'Warehouse', value: 'WAREHOUSE' }, { label: 'Accountant', value: 'ACCOUNTANT' },
]
const columns = [
  { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'actions', label: '' },
]
onMounted(async () => {
  try { users.value = await request<any[]>('/users') }
  finally { loading.value = false }
})
async function sendInvite() {
  inviting.value = true
  try {
    await request('/users/invite', { method: 'POST', body: invite })
    invite.email = ''; showInvite.value = false
  }
  finally { inviting.value = false }
}
async function toggleUser(user: any) {
  if (user.status === 'INACTIVE') {
    await request(`/users/${user.id}/reactivate`, { method: 'PATCH' })
    user.status = 'ACTIVE'
  }
  else {
    await request(`/users/${user.id}`, { method: 'DELETE' })
    user.status = 'INACTIVE'
  }
}
</script>
