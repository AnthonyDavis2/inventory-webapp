<template>
  <div class="max-w-xl">
    <PageHeader title="Import Products">
      <template #actions>
        <UButton to="/app/products" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div>
        <p class="text-sm text-gray-600 mb-3">Download the template, fill it in, then upload it here.</p>
        <UButton variant="outline" size="sm" icon="i-heroicons-arrow-down-tray" @click="downloadTemplate">
          Download CSV Template
        </UButton>
      </div>

      <div class="border-t border-gray-100 pt-5">
        <UFormGroup label="Upload CSV file">
          <input ref="fileInput" type="file" accept=".csv" class="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" @change="onFileChange" />
        </UFormGroup>
      </div>

      <UAlert v-if="error" color="red" :description="error" />
      <UAlert v-if="success" color="green" :description="success" />

      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" :disabled="!file" class="bg-indigo-600 hover:bg-indigo-700" @click="uploadFile">
          Start Import
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const file = ref<File | null>(null)
const loading = ref(false)
const error = ref('')
const success = ref('')

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function downloadTemplate() {
  const blob = await request<Blob>('/imports/template/products', { responseType: 'blob' })
  const url = URL.createObjectURL(blob as any)
  const a = document.createElement('a')
  a.href = url
  a.download = 'products-template.csv'
  a.click()
}

async function uploadFile() {
  if (!file.value) return
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const init = await request<{ upload_url: string; import_id: string }>('/imports/products/initiate', { method: 'POST' })
    await $fetch(init.upload_url, { method: 'PUT', body: file.value, headers: { 'Content-Type': 'text/csv' } })
    await request(`/imports/${init.import_id}/confirm-upload`, { method: 'POST' })
    success.value = 'Import started. Check Import History in Settings for status.'
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Upload failed'
  }
  finally { loading.value = false }
}
</script>
