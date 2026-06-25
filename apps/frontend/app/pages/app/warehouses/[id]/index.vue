<template>
  <div v-if="warehouse">
    <PageHeader :title="warehouse.name">
      <template #actions>
        <UButton :to="`/app/warehouses/${warehouse.id}/edit`" variant="outline" size="sm">Edit</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCard title="Details">
        <InfoRow label="Code" :value="warehouse.code" mono />
        <InfoRow label="Default" :value="warehouse.is_default ? 'Yes' : 'No'" />
        <InfoRow label="Bin Locations" :value="warehouse.bins_enabled ? 'Enabled' : 'Disabled'" />
        <InfoRow label="Address" :value="warehouse.address" />
      </InfoCard>
      <InfoCard title="Bin Locations">
        <div v-if="!warehouse.bins_enabled" class="text-sm text-gray-400 py-2">Bin tracking not enabled</div>
        <template v-else>
          <div v-for="bin in bins" :key="bin.id" class="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
            <span class="font-mono">{{ bin.code }}</span>
            <span class="text-gray-500">{{ bin.name }}</span>
          </div>
          <button class="mt-3 text-sm text-indigo-600 hover:underline" @click="showBinForm = true">+ Add bin</button>
          <div v-if="showBinForm" class="mt-3 flex gap-2">
            <UInput v-model="newBin.code" placeholder="A-01-01" class="w-28" />
            <UInput v-model="newBin.name" placeholder="Aisle A, Rack 1, Shelf 1" class="flex-1" />
            <UButton size="sm" :loading="creatingBin" class="bg-indigo-600" @click="createBin">Add</UButton>
          </div>
        </template>
      </InfoCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const warehouse = ref<any>(null)
const bins = ref<any[]>([])
const showBinForm = ref(false)
const newBin = reactive({ code: '', name: '' })
const creatingBin = ref(false)
onMounted(async () => {
  const [wh, b] = await Promise.all([
    request<any>(`/warehouses/${route.params.id}`),
    request<any[]>(`/warehouses/${route.params.id}/bins`).catch(() => []),
  ])
  warehouse.value = wh
  bins.value = b
})
async function createBin() {
  creatingBin.value = true
  try {
    const bin = await request<any>(`/warehouses/${route.params.id}/bins`, { method: 'POST', body: newBin })
    bins.value.push(bin)
    newBin.code = ''; newBin.name = ''; showBinForm.value = false
  }
  finally { creatingBin.value = false }
}
</script>
