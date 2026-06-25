<template>
  <div class="max-w-xl">
    <PageHeader title="Notification Preferences" />
    <UAlert v-if="saved" color="green" description="Preferences saved." class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <div v-for="pref in prefs" :key="pref.key" class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <div>
          <p class="text-sm font-medium text-gray-900">{{ pref.label }}</p>
          <p class="text-xs text-gray-500">{{ pref.desc }}</p>
        </div>
        <UToggle v-model="pref.enabled" />
      </div>
      <div class="flex justify-end pt-2">
        <UButton :loading="saving" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Save</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const saving = ref(false)
const saved = ref(false)
const prefs = reactive([
  { key: 'reorder_alerts', label: 'Reorder Alerts', desc: 'Notify when stock falls below reorder point', enabled: true },
  { key: 'po_approvals', label: 'PO Approval Requests', desc: 'Notify when a PO needs your approval', enabled: true },
  { key: 'invoice_paid', label: 'Invoice Paid', desc: 'Notify when a customer pays an invoice', enabled: true },
  { key: 'invoice_overdue', label: 'Overdue Invoices', desc: 'Daily digest of overdue invoices', enabled: true },
  { key: 'work_order_complete', label: 'Work Orders Complete', desc: 'Notify when a work order finishes', enabled: false },
])
onMounted(async () => {
  const data = await request<Record<string, boolean>>('/notifications/preferences').catch(() => null)
  if (data) prefs.forEach(p => { if (p.key in (data as any)) p.enabled = (data as any)[p.key] })
})
async function save() {
  saving.value = true; saved.value = false
  try {
    const body = Object.fromEntries(prefs.map(p => [p.key, p.enabled]))
    await request('/notifications/preferences', { method: 'PUT', body }); saved.value = true
  }
  finally { saving.value = false }
}
</script>
