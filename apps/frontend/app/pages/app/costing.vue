<template>
  <div>
    <PageHeader title="Costing" />
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <InfoCard title="Margin Analysis">
        <div v-if="loading" class="py-4 text-center"><UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" /></div>
        <template v-else>
          <div v-if="margins.length === 0" class="text-sm text-gray-400 py-2">No costed products yet</div>
          <div v-for="item in margins" :key="item.product?.id" class="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
            <div>
              <p class="text-sm font-medium">{{ item.product?.name }}</p>
              <p class="text-xs text-gray-500 font-mono">{{ item.product?.sku }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium">{{ formatCurrency(Number(item.standard_cost_cents)) }}</p>
              <p class="text-xs" :class="(item.margin_pct ?? 0) > 0 ? 'text-green-600' : 'text-red-600'">
                {{ item.margin_pct != null ? item.margin_pct.toFixed(1) + '%' : '—' }}
              </p>
            </div>
          </div>
        </template>
      </InfoCard>
      <InfoCard title="Work Order Variances">
        <div v-if="variances.length === 0" class="text-sm text-gray-400 py-2">No completed work orders</div>
        <div v-for="v in variances.slice(0, 8)" :key="v.wo_number" class="flex justify-between py-2.5 border-b border-gray-100 last:border-0 text-sm">
          <span class="font-mono">{{ v.wo_number }}</span>
          <span :class="Number(v.variance_cents) > 0 ? 'text-red-600' : 'text-green-600'" class="font-medium">
            {{ formatCurrency(Math.abs(Number(v.variance_cents))) }}
            {{ Number(v.variance_cents) > 0 ? 'over' : 'under' }}
          </span>
        </div>
      </InfoCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const margins = ref<any[]>([])
const variances = ref<any[]>([])
const loading = ref(true)
onMounted(async () => {
  try {
    const [m, v] = await Promise.all([
      request<any[]>('/costing/margin-analysis').catch(() => []),
      request<any[]>('/costing/work-order-variance').catch(() => []),
    ])
    margins.value = m; variances.value = v
  }
  finally { loading.value = false }
})
</script>
