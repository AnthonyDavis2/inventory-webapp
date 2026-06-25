<template>
  <div class="max-w-2xl">
    <PageHeader :title="`Fulfill — ${so?.so_number}`">
      <template #actions>
        <UButton :to="`/app/sales/orders/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="so" class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <UFormGroup label="Tracking Number">
        <UInput v-model="form.tracking_number" placeholder="Optional" />
      </UFormGroup>
      <UFormGroup label="Carrier">
        <UInput v-model="form.carrier" placeholder="UPS, FedEx, etc." />
      </UFormGroup>
      <div class="border-t border-gray-100 pt-4">
        <h3 class="text-sm font-semibold mb-3">Lines to Ship</h3>
        <div v-for="line in shipLines" :key="line.so_line_id" class="flex items-center gap-4 mb-3">
          <div class="flex-1">
            <p class="text-sm font-medium">{{ line.name }}</p>
            <p class="text-xs text-gray-500">Ordered: {{ line.ordered }} · Fulfilled: {{ line.fulfilled }}</p>
          </div>
          <UInput v-model="line.qty" type="number" :max="line.ordered - line.fulfilled" min="0" step="any" class="w-28" />
        </div>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="ship">Create Shipment</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const so = ref<any>(null)
const shipLines = ref<any[]>([])
const form = reactive({ tracking_number: '', carrier: '' })
const loading = ref(false)
const error = ref('')
onMounted(async () => {
  so.value = await request<any>(`/sales/orders/${route.params.id}`)
  shipLines.value = so.value.lines.map((l: any) => ({
    so_line_id: l.id,
    name: `${l.product?.sku} – ${l.product?.name}`,
    ordered: Number(l.quantity_ordered),
    fulfilled: Number(l.quantity_fulfilled),
    qty: String(Math.max(0, Number(l.quantity_ordered) - Number(l.quantity_fulfilled))),
  }))
})
async function ship() {
  loading.value = true; error.value = ''
  try {
    await request(`/sales/orders/${route.params.id}/shipments`, {
      method: 'POST',
      body: {
        tracking_number: form.tracking_number || undefined,
        carrier: form.carrier || undefined,
        lines: shipLines.value.filter(l => Number(l.qty) > 0).map(l => ({ so_line_id: l.so_line_id, quantity: Number(l.qty) })),
      },
    })
    await router.push(`/app/sales/orders/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Fulfillment failed' }
  finally { loading.value = false }
}
</script>
