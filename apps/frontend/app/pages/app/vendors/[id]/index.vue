<template>
  <div v-if="vendor">
    <PageHeader :title="vendor.name">
      <template #actions>
        <UButton :to="`/app/vendors/${vendor.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton to="/app/purchasing/orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New PO</UButton>
      </template>
    </PageHeader>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Vendor Details">
          <InfoRow label="Code" :value="vendor.code" mono />
          <InfoRow label="Email" :value="vendor.email" />
          <InfoRow label="Phone" :value="vendor.phone" />
          <InfoRow label="Website" :value="vendor.website" />
          <InfoRow label="Payment Terms" :value="vendor.payment_terms" />
          <InfoRow label="Status" :value="vendor.status" />
        </InfoCard>

        <InfoCard title="Recent Purchase Orders">
          <div v-if="orders.length === 0" class="text-sm text-gray-400 py-2">No purchase orders</div>
          <div v-for="po in orders.slice(0, 5)" :key="po.id" class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <NuxtLink :to="`/app/purchasing/orders/${po.id}`" class="text-sm text-indigo-600 hover:underline font-mono">{{ po.po_number }}</NuxtLink>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-500">{{ new Date(po.created_at).toLocaleDateString() }}</span>
              <UBadge :label="po.status" variant="soft" size="xs" />
            </div>
          </div>
        </InfoCard>
      </div>

      <div class="space-y-4">
        <InfoCard title="Contacts">
          <div v-if="vendor.contacts?.length === 0" class="text-sm text-gray-400">No contacts</div>
          <div v-for="c in vendor.contacts" :key="c.id" class="py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium">{{ c.name }}</p>
            <p class="text-xs text-gray-500">{{ c.email }}</p>
          </div>
        </InfoCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const vendor = ref<any>(null)
const orders = ref<any[]>([])
onMounted(async () => {
  const [v, o] = await Promise.all([
    request<any>(`/vendors/${route.params.id}`),
    request<any[]>(`/purchasing/orders`, { query: { vendor_id: route.params.id, limit: 5 } }).catch(() => []),
  ])
  vendor.value = v
  orders.value = (o as any).data ?? o
})
</script>
