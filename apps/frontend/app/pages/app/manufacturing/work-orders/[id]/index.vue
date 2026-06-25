<template>
  <div v-if="wo">
    <PageHeader :title="wo.wo_number">
      <template #actions>
        <UButton v-if="wo.status === 'DRAFT'" :loading="actioning" variant="outline" size="sm" @click="action('release')">Release</UButton>
        <UButton v-if="wo.status === 'RELEASED'" :loading="actioning" variant="outline" size="sm" @click="action('start')">Start</UButton>
        <UButton v-if="wo.status === 'IN_PROGRESS'" :to="`/app/manufacturing/work-orders/${wo.id}/execute`" class="bg-indigo-600 hover:bg-indigo-700" size="sm">Record Production</UButton>
        <UButton v-if="['DRAFT','RELEASED'].includes(wo.status)" :loading="actioning" variant="outline" size="sm" color="red" @click="action('cancel')">Cancel</UButton>
      </template>
    </PageHeader>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <InfoCard title="Work Order Details">
          <InfoRow label="Status" :value="wo.status" />
          <InfoRow label="Product" :value="`${wo.product?.sku} – ${wo.product?.name}`" />
          <InfoRow label="Warehouse" :value="wo.warehouse?.name" />
          <InfoRow label="Planned Qty" :value="String(wo.quantity_planned)" />
          <InfoRow label="Produced Qty" :value="String(wo.quantity_produced)" />
          <InfoRow label="Planned Cost" :value="formatCurrency(Number(wo.planned_cost_cents))" />
          <InfoRow label="Actual Cost" :value="formatCurrency(Number(wo.actual_cost_cents))" />
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
const wo = ref<any>(null)
const actioning = ref(false)
onMounted(async () => { wo.value = await request<any>(`/manufacturing/work-orders/${route.params.id}`) })
async function action(act: string) {
  actioning.value = true
  try { wo.value = await request<any>(`/manufacturing/work-orders/${route.params.id}/status`, { method: 'PATCH', body: { action: act } }) }
  catch (e: any) { alert(e?.data?.message) }
  finally { actioning.value = false }
}
</script>
