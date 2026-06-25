<template>
  <div v-if="lot">
    <PageHeader :title="`Lot: ${lot.lot_number}`">
      <template #actions>
        <UButton to="/app/inventory/lots" variant="outline" size="sm">← Back</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCard title="Lot Details">
        <InfoRow label="Lot Number" :value="lot.lot_number" mono />
        <InfoRow label="Product" :value="`${lot.product?.sku} – ${lot.product?.name}`" />
        <InfoRow label="Quantity on Hand" :value="String(lot.quantity_on_hand)" />
        <InfoRow label="Expiry Date" :value="lot.expiry_date ? new Date(lot.expiry_date).toLocaleDateString() : undefined" />
        <InfoRow label="Supplier Lot" :value="lot.supplier_lot_number" />
      </InfoCard>
      <InfoCard title="Movements">
        <div v-if="movements.length === 0" class="text-sm text-gray-400 py-2">No movements</div>
        <div v-for="m in movements" :key="m.id" class="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
          <span>{{ new Date(m.created_at).toLocaleDateString() }} · {{ m.movement_type }}</span>
          <span :class="m.quantity < 0 ? 'text-red-600' : 'text-green-600'" class="font-mono">{{ m.quantity > 0 ? '+' : '' }}{{ m.quantity }}</span>
        </div>
      </InfoCard>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const lot = ref<any>(null)
const movements = ref<any[]>([])
onMounted(async () => {
  const [l, m] = await Promise.all([
    request<any>(`/inventory/lots/${route.params.id}`),
    request<any[]>(`/inventory/lots/${route.params.id}/movements`).catch(() => []),
  ])
  lot.value = l
  movements.value = m
})
</script>
