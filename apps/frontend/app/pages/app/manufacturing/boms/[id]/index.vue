<template>
  <div v-if="bom">
    <PageHeader :title="bom.name">
      <template #actions>
        <UButton :to="`/app/manufacturing/boms/${bom.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton to="/app/manufacturing/work-orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ Work Order</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <InfoCard title="BOM Details">
          <InfoRow label="Product" :value="`${bom.product?.sku} – ${bom.product?.name}`" />
          <InfoRow label="Active Version" :value="bom.active_version?.version_number ? `v${bom.active_version.version_number}` : 'None'" />
        </InfoCard>
        <div class="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100"><h3 class="text-sm font-semibold">Components</h3></div>
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500">
              <tr><th class="px-4 py-2 text-left">Component</th><th class="px-4 py-2 text-right">Qty</th><th class="px-4 py-2 text-left">UOM</th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="line in bom.active_version?.lines ?? []" :key="line.id">
                <td class="px-4 py-3">
                  <p class="font-medium">{{ line.component?.name }}</p>
                  <p class="text-xs text-gray-500 font-mono">{{ line.component?.sku }}</p>
                </td>
                <td class="px-4 py-3 text-right">{{ line.quantity }}</td>
                <td class="px-4 py-3">{{ line.uom?.symbol }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <InfoCard title="Versions">
        <div v-for="v in bom.versions ?? []" :key="v.id" class="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
          <span>v{{ v.version_number }}</span>
          <UBadge v-if="v.is_active" label="Active" color="green" variant="soft" size="xs" />
        </div>
      </InfoCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const bom = ref<any>(null)
onMounted(async () => { bom.value = await request<any>(`/manufacturing/boms/${route.params.id}`) })
</script>
