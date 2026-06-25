<template>
  <div class="max-w-2xl">
    <PageHeader title="Units of Measure">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showForm = true">+ Custom UOM</UButton>
      </template>
    </PageHeader>
    <div v-if="showForm" class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div class="grid grid-cols-3 gap-3">
        <UFormGroup label="Name"><UInput v-model="newUom.name" placeholder="Kilogram" /></UFormGroup>
        <UFormGroup label="Symbol"><UInput v-model="newUom.symbol" placeholder="kg" /></UFormGroup>
        <UFormGroup label="Type">
          <USelect v-model="newUom.unit_type" :options="unitTypes" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>
      <div class="flex gap-2 mt-3">
        <UButton :loading="creating" class="bg-indigo-600" @click="create">Create</UButton>
        <UButton variant="outline" @click="showForm = false">Cancel</UButton>
      </div>
    </div>
    <div class="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      <div v-for="uom in uoms" :key="uom.id" class="flex items-center justify-between px-4 py-3">
        <div>
          <span class="text-sm font-medium">{{ uom.name }}</span>
          <span class="ml-2 text-xs text-gray-500 font-mono">({{ uom.symbol }})</span>
          <UBadge v-if="uom.is_system" label="System" class="ml-2" variant="soft" size="xs" />
        </div>
        <span class="text-xs text-gray-500">{{ uom.unit_type }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const uoms = ref<any[]>([])
const showForm = ref(false)
const newUom = reactive({ name: '', symbol: '', unit_type: 'COUNT' })
const creating = ref(false)
const unitTypes = [
  { label: 'Count', value: 'COUNT' }, { label: 'Weight', value: 'WEIGHT' },
  { label: 'Volume', value: 'VOLUME' }, { label: 'Length', value: 'LENGTH' },
]
onMounted(async () => {
  const data = await request<{ data: any[] }>('/uom')
  uoms.value = (data as any).data ?? data
})
async function create() {
  creating.value = true
  try {
    const u = await request<any>('/uom', { method: 'POST', body: newUom })
    uoms.value.push(u); Object.assign(newUom, { name: '', symbol: '', unit_type: 'COUNT' }); showForm.value = false
  }
  finally { creating.value = false }
}
</script>
