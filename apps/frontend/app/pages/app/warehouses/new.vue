<template>
  <div class="max-w-xl">
    <PageHeader title="New Warehouse">
      <template #actions>
        <UButton to="/app/warehouses" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Name" required>
        <UInput v-model="form.name" placeholder="Main Warehouse" />
      </UFormGroup>
      <UFormGroup label="Code" required>
        <UInput v-model="form.code" placeholder="MAIN" />
      </UFormGroup>
      <UFormGroup label="Address">
        <UInput v-model="form.address" placeholder="123 Industrial Blvd, Dallas TX 75201" />
      </UFormGroup>
      <div class="flex items-center gap-3">
        <UToggle v-model="form.bins_enabled" />
        <div>
          <p class="text-sm font-medium">Track bin locations</p>
          <p class="text-xs text-gray-500">Can't be disabled after first inventory receipt.</p>
        </div>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create Warehouse</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ name: '', code: '', address: '', bins_enabled: false })
const loading = ref(false)
const error = ref('')
async function save() {
  loading.value = true; error.value = ''
  try {
    const wh = await request<any>('/warehouses', { method: 'POST', body: form })
    await router.push(`/app/warehouses/${wh.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed to create warehouse' }
  finally { loading.value = false }
}
</script>
