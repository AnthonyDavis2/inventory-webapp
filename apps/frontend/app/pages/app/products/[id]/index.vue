<template>
  <div v-if="product">
    <PageHeader :title="product.name">
      <template #actions>
        <UButton :to="`/app/products/${product.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton variant="outline" size="sm" color="red" :loading="deleting" @click="deleteProduct">Delete</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main info -->
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Product Details">
          <InfoRow label="SKU" :value="product.sku" mono />
          <InfoRow label="Type" :value="product.type" />
          <InfoRow label="Description" :value="product.description" />
          <InfoRow label="Status" :value="product.status" />
          <InfoRow label="Stocking UOM" :value="product.stocking_uom?.name" />
          <InfoRow label="Category" :value="product.category?.name" />
          <InfoRow label="Lot Tracked" :value="product.lot_tracked ? 'Yes' : 'No'" />
          <InfoRow label="Serial Tracked" :value="product.serial_tracked ? 'Yes' : 'No'" />
        </InfoCard>

        <!-- Stock levels -->
        <InfoCard title="Stock Levels">
          <div v-if="stockLevels.length === 0" class="text-sm text-gray-400 py-2">No inventory on hand</div>
          <div v-for="s in stockLevels" :key="s.warehouse_id" class="flex justify-between py-2 border-b border-gray-100 last:border-0">
            <span class="text-sm text-gray-700">{{ s.warehouse.name }}</span>
            <span class="text-sm font-semibold">{{ s.quantity_on_hand }}</span>
          </div>
        </InfoCard>
      </div>

      <!-- Side panel -->
      <div class="space-y-4">
        <InfoCard title="Barcodes">
          <div v-if="product.barcodes?.length === 0" class="text-sm text-gray-400">None</div>
          <div v-for="b in product.barcodes" :key="b.id" class="flex justify-between text-sm py-1">
            <span class="font-mono">{{ b.barcode_value }}</span>
            <UBadge v-if="b.is_primary" label="Primary" size="xs" />
          </div>
        </InfoCard>
      </div>
    </div>
  </div>
  <div v-else-if="loading" class="flex justify-center py-16">
    <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { request } = useApi()
const product = ref<any>(null)
const stockLevels = ref<any[]>([])
const loading = ref(true)
const deleting = ref(false)

onMounted(async () => {
  try {
    const [p, s] = await Promise.all([
      request<any>(`/products/${route.params.id}`),
      request<any[]>(`/inventory/stock/${route.params.id}`),
    ])
    product.value = p
    stockLevels.value = s
  }
  finally { loading.value = false }
})

async function deleteProduct() {
  if (!confirm('Delete this product? This cannot be undone.')) return
  deleting.value = true
  try {
    await request(`/products/${route.params.id}`, { method: 'DELETE' })
    await router.push('/app/products')
  }
  catch (e: any) {
    alert(e?.data?.message ?? 'Cannot delete product')
  }
  finally { deleting.value = false }
}
</script>
