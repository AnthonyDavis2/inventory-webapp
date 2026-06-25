<template>
  <div v-if="quote">
    <PageHeader :title="quote.quote_number">
      <template #actions>
        <UButton v-if="quote.status === 'DRAFT'" :loading="actioning" variant="outline" size="sm" @click="action('send')">Send</UButton>
        <UButton v-if="quote.status === 'SENT'" :loading="actioning" class="bg-indigo-600 hover:bg-indigo-700" size="sm" @click="convertToSO">Convert to SO</UButton>
        <UButton v-if="['DRAFT','SENT'].includes(quote.status)" :loading="actioning" variant="outline" size="sm" color="red" @click="action('reject')">Reject</UButton>
      </template>
    </PageHeader>
    <InfoCard title="Quote Details">
      <InfoRow label="Status" :value="quote.status" />
      <InfoRow label="Customer" :value="quote.customer?.name" />
      <InfoRow label="Expires" :value="quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : undefined" />
      <InfoRow label="Total" :value="formatCurrency(quote.total_cents)" />
    </InfoCard>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const quote = ref<any>(null)
const actioning = ref(false)
onMounted(async () => { quote.value = await request<any>(`/sales/quotes/${route.params.id}`) })
async function action(act: string) {
  actioning.value = true
  try { quote.value = await request<any>(`/sales/quotes/${route.params.id}/status`, { method: 'PATCH', body: { action: act } }) }
  catch (e: any) { alert(e?.data?.message) }
  finally { actioning.value = false }
}
async function convertToSO() {
  actioning.value = true
  try {
    const so = await request<any>(`/sales/quotes/${route.params.id}/convert`)
    await router.push(`/app/sales/orders/${so.id}`)
  }
  catch (e: any) { alert(e?.data?.message) }
  finally { actioning.value = false }
}
</script>
