<template>
  <div v-if="customer">
    <PageHeader :title="customer.name">
      <template #actions>
        <UButton :to="`/app/customers/${customer.id}/edit`" variant="outline" size="sm">Edit</UButton>
        <UButton to="/app/sales/orders/new" class="bg-indigo-600 hover:bg-indigo-700" size="sm">+ New Order</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-4">
        <InfoCard title="Customer Details">
          <InfoRow label="Code" :value="customer.code" mono />
          <InfoRow label="Email" :value="customer.email" />
          <InfoRow label="Phone" :value="customer.phone" />
          <InfoRow label="Payment Terms" :value="customer.payment_terms" />
          <InfoRow label="Credit Limit" :value="formatCurrency(customer.credit_limit_cents ?? 0)" />
          <InfoRow label="Tax Exempt" :value="customer.tax_exempt ? 'Yes' : 'No'" />
          <InfoRow label="Status" :value="customer.status" />
        </InfoCard>

        <InfoCard title="Recent Orders">
          <div v-if="orders.length === 0" class="text-sm text-gray-400 py-2">No orders</div>
          <div v-for="so in orders.slice(0, 5)" :key="so.id" class="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <NuxtLink :to="`/app/sales/orders/${so.id}`" class="text-sm text-indigo-600 hover:underline font-mono">{{ so.so_number }}</NuxtLink>
            <div class="flex items-center gap-3">
              <span class="text-xs text-gray-500">{{ formatCurrency(so.total_cents) }}</span>
              <UBadge :label="so.status" variant="soft" size="xs" />
            </div>
          </div>
        </InfoCard>
      </div>
      <div class="space-y-4">
        <InfoCard title="Contacts">
          <div v-if="!customer.contacts?.length" class="text-sm text-gray-400">No contacts</div>
          <div v-for="c in customer.contacts" :key="c.id" class="py-2 border-b border-gray-100 last:border-0">
            <p class="text-sm font-medium">{{ c.name }}</p>
            <p class="text-xs text-gray-500">{{ c.email }}</p>
          </div>
        </InfoCard>
        <InfoCard title="Billing Address">
          <div v-if="!billingAddress" class="text-sm text-gray-400">No address on file</div>
          <div v-else class="text-sm text-gray-700 space-y-0.5">
            <p>{{ billingAddress.line1 }}</p>
            <p v-if="billingAddress.line2">{{ billingAddress.line2 }}</p>
            <p>{{ billingAddress.city }}, {{ billingAddress.state }} {{ billingAddress.zip }}</p>
          </div>
        </InfoCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const customer = ref<any>(null)
const orders = ref<any[]>([])
const billingAddress = computed(() => customer.value?.addresses?.find((a: any) => a.type === 'BILLING'))
onMounted(async () => {
  const [c, o] = await Promise.all([
    request<any>(`/customers/${route.params.id}`),
    request<{ data: any[] }>('/sales/orders', { query: { customer_id: route.params.id, limit: 5 } }).catch(() => ({ data: [] })),
  ])
  customer.value = c
  orders.value = (o as any).data ?? o
})
</script>
