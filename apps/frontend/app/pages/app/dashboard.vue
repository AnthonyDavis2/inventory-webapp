<template>
  <div>
    <h1 class="text-xl font-semibold text-gray-950 mb-6">Dashboard</h1>

    <div v-if="loading" class="flex justify-center py-16">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <template v-else>
      <!-- KPI Row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Revenue (30d)" :value="formatCurrency(stats?.revenue_30d ?? 0)" icon="i-heroicons-currency-dollar" />
        <StatCard label="Open Orders" :value="String(stats?.open_sales_orders ?? 0)" icon="i-heroicons-shopping-bag" />
        <StatCard label="Low Stock SKUs" :value="String(stats?.low_stock_count ?? 0)" icon="i-heroicons-exclamation-triangle" color="yellow" />
        <StatCard label="Overdue Invoices" :value="String(stats?.overdue_invoice_count ?? 0)" icon="i-heroicons-clock" color="red" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Activity -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-semibold text-gray-900 mb-4">Reorder Alerts</h2>
          <div v-if="reorderAlerts.length === 0" class="text-sm text-gray-400 py-4 text-center">No items below reorder point</div>
          <ul v-else class="divide-y divide-gray-100">
            <li v-for="item in reorderAlerts.slice(0, 8)" :key="item.product_id" class="py-2.5 flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-900">{{ item.product_name }}</p>
                <p class="text-xs text-gray-500">{{ item.warehouse_name }} · On hand: {{ item.quantity_on_hand }}</p>
              </div>
              <span class="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">Reorder: {{ item.reorder_point }}</span>
            </li>
          </ul>
        </div>

        <!-- Aged Receivables Summary -->
        <div class="bg-white rounded-xl border border-gray-200 p-5">
          <h2 class="text-sm font-semibold text-gray-900 mb-4">Receivables Summary</h2>
          <div v-if="!receivables" class="text-sm text-gray-400 py-4 text-center">No outstanding invoices</div>
          <template v-else>
            <div v-for="bucket in receivables" :key="bucket.label" class="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span class="text-sm text-gray-600">{{ bucket.label }}</span>
              <span class="text-sm font-medium" :class="bucket.label.includes('90+') ? 'text-red-600' : 'text-gray-900'">
                {{ formatCurrency(bucket.total_cents) }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'

definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const loading = ref(true)
const stats = ref<any>(null)
const reorderAlerts = ref<any[]>([])
const receivables = ref<any[]>([])

onMounted(async () => {
  try {
    const [dashData, reorderData, arData] = await Promise.all([
      request<any>('/reporting/dashboard/executive'),
      request<any[]>('/inventory/reorder-alerts'),
      request<any[]>('/invoicing/aged-receivables'),
    ])
    stats.value = dashData
    reorderAlerts.value = reorderData
    receivables.value = arData
  }
  catch {}
  finally { loading.value = false }
})
</script>
