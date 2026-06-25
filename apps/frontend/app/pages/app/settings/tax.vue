<template>
  <div class="max-w-xl">
    <PageHeader title="Tax Settings" />
    <UAlert v-if="saved" color="green" description="Saved." class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <UFormGroup label="Default Tax Rate (%)">
        <UInput v-model="form.default_tax_rate" type="number" step="0.001" min="0" max="100" />
      </UFormGroup>
      <UFormGroup label="Tax Registration Number (EIN/TIN)">
        <UInput v-model="form.tax_id" placeholder="12-3456789" />
      </UFormGroup>
      <UFormGroup>
        <div class="flex items-center gap-3">
          <UToggle v-model="form.collect_tax" />
          <span class="text-sm text-gray-700">Collect sales tax on invoices</span>
        </div>
      </UFormGroup>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const form = reactive({ default_tax_rate: '', tax_id: '', collect_tax: true })
const saving = ref(false)
const saved = ref(false)
onMounted(async () => {
  const org = await request<any>('/organizations/me').catch(() => null)
  if (org?.tax_settings) Object.assign(form, org.tax_settings)
})
async function save() {
  saving.value = true; saved.value = false
  try { await request('/organizations/me', { method: 'PATCH', body: { tax_settings: { ...form } } }); saved.value = true }
  finally { saving.value = false }
}
</script>
