<template>
  <div class="max-w-2xl">
    <PageHeader :title="`Receive — ${po?.po_number}`">
      <template #actions>
        <UButton :to="`/app/purchasing/orders/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="po" class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <p class="text-sm text-gray-500">Enter quantities received for each line. Leave 0 to skip.</p>
      <div class="space-y-3">
        <div v-for="line in receiveLines" :key="line.po_line_id" class="flex items-center gap-4">
          <div class="flex-1">
            <p class="text-sm font-medium">{{ line.name }}</p>
            <p class="text-xs text-gray-500">Ordered: {{ line.ordered }} · Received so far: {{ line.received }}</p>
          </div>
          <UInput v-model="line.qty" type="number" :max="line.ordered - line.received" min="0" step="any" class="w-28" />
        </div>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="receive">Confirm Receipt</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const po = ref<any>(null)
const receiveLines = ref<any[]>([])
const loading = ref(false)
const error = ref('')
onMounted(async () => {
  po.value = await request<any>(`/purchasing/orders/${route.params.id}`)
  receiveLines.value = po.value.lines.map((l: any) => ({
    po_line_id: l.id,
    name: `${l.product?.sku} – ${l.product?.name}`,
    ordered: Number(l.quantity_ordered),
    received: Number(l.quantity_received),
    qty: String(Math.max(0, Number(l.quantity_ordered) - Number(l.quantity_received))),
  }))
})
async function receive() {
  loading.value = true; error.value = ''
  try {
    await request(`/purchasing/orders/${route.params.id}/receive`, {
      method: 'POST',
      body: {
        lines: receiveLines.value.filter(l => Number(l.qty) > 0).map(l => ({
          po_line_id: l.po_line_id,
          quantity_received: Number(l.qty),
        })),
      },
    })
    await router.push(`/app/purchasing/orders/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Receive failed' }
  finally { loading.value = false }
}
</script>
