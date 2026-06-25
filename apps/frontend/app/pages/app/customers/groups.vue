<template>
  <div class="max-w-xl">
    <PageHeader title="Customer Groups">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showForm = true">+ New Group</UButton>
      </template>
    </PageHeader>
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div class="flex gap-3">
        <UInput v-model="newName" placeholder="Group name" class="flex-1" />
        <UButton :loading="creating" class="bg-indigo-600" @click="create">Create</UButton>
        <UButton variant="outline" @click="showForm = false">Cancel</UButton>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div v-if="groups.length === 0" class="py-8 text-center text-sm text-gray-400">No groups yet</div>
      <div v-for="g in groups" :key="g.id" class="flex items-center justify-between px-4 py-3">
        <span class="text-sm text-gray-900">{{ g.name }}</span>
        <UButton variant="ghost" size="xs" color="red" icon="i-heroicons-trash" @click="deleteGroup(g.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const groups = ref<any[]>([])
const showForm = ref(false)
const newName = ref('')
const creating = ref(false)
onMounted(async () => {
  groups.value = await request<any[]>('/customer-groups').catch(() => [])
})
async function create() {
  creating.value = true
  try {
    const g = await request<any>('/customer-groups', { method: 'POST', body: { name: newName.value } })
    groups.value.push(g); newName.value = ''; showForm.value = false
  }
  finally { creating.value = false }
}
async function deleteGroup(id: string) {
  if (!confirm('Delete this group?')) return
  try {
    await request(`/customer-groups/${id}`, { method: 'DELETE' })
    groups.value = groups.value.filter(g => g.id !== id)
  }
  catch (e: any) { alert(e?.data?.message ?? 'Cannot delete') }
}
</script>
