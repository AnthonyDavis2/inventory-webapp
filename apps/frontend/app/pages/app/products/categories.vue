<template>
  <div class="max-w-2xl">
    <PageHeader title="Product Categories">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showForm = true">+ New Category</UButton>
      </template>
    </PageHeader>

    <!-- Create form -->
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <h3 class="text-sm font-semibold mb-3">New Category</h3>
      <div class="flex gap-3">
        <UInput v-model="newCat.name" placeholder="Category name" class="flex-1" />
        <UButton :loading="creating" class="bg-indigo-600 hover:bg-indigo-700" @click="createCategory">Create</UButton>
        <UButton variant="outline" @click="showForm = false">Cancel</UButton>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div v-if="categories.length === 0" class="py-8 text-center text-sm text-gray-400">No categories yet</div>
      <div v-for="cat in categories" :key="cat.id" class="flex items-center justify-between px-4 py-3">
        <span class="text-sm text-gray-900">{{ cat.name }}</span>
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
const newCat = reactive({ name: '', parent_id: '' })
const creating = ref(false)

onMounted(async () => {
  const data = await request<{ data: any[] }>('/products/categories').catch(() => ({ data: [] }))
  categories.value = (data as any).data ?? []
})

async function createCategory() {
  if (!newCat.name) return
  creating.value = true
  try {
    const cat = await request<any>('/products/categories', { method: 'POST', body: { name: newCat.name } })
    categories.value.push(cat)
    newCat.name = ''
    showForm.value = false
  }
  finally { creating.value = false }
}

async function deleteCategory(id: string) {
  if (!confirm('Delete this category?')) return
  try {
    await request(`/products/categories/${id}`, { method: 'DELETE' })
    categories.value = categories.value.filter(c => c.id !== id)
  }
  catch (e: any) {
    alert(e?.data?.message ?? 'Cannot delete')
  }
}
</script>
