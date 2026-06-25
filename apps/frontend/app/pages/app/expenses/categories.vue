<template>
  <div class="max-w-xl">
    <PageHeader title="Expense Categories">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showForm = true">+ New Category</UButton>
      </template>
    </PageHeader>
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div class="flex gap-3">
        <UInput v-model="newName" placeholder="Category name" class="flex-1" />
        <UButton :loading="creating" class="bg-indigo-600" @click="create">Create</UButton>
        <UButton variant="outline" @click="showForm = false">Cancel</UButton>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div v-if="categories.length === 0" class="py-8 text-center text-sm text-gray-400">No categories</div>
      <div v-for="cat in categories" :key="cat.id" class="flex items-center justify-between px-4 py-3">
        <span class="text-sm">{{ cat.name }}</span>
        <UButton variant="ghost" size="xs" color="red" icon="i-heroicons-trash" @click="deleteCategory(cat.id)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const categories = ref<any[]>([])
const showForm = ref(false)
const newName = ref('')
const creating = ref(false)
onMounted(async () => { categories.value = await request<any[]>('/expenses/categories').catch(() => []) })
async function create() {
  creating.value = true
  try {
    const c = await request<any>('/expenses/categories', { method: 'POST', body: { name: newName.value } })
    categories.value.push(c); newName.value = ''; showForm.value = false
  }
  finally { creating.value = false }
}
async function deleteCategory(id: string) {
  if (!confirm('Delete?')) return
  try {
    await request(`/expenses/categories/${id}`, { method: 'DELETE' })
    categories.value = categories.value.filter(c => c.id !== id)
  }
  catch (e: any) { alert(e?.data?.message) }
}
</script>
