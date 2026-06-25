<template>
  <div class="max-w-xl">
    <PageHeader :title="`Execute — ${wo?.wo_number}`">
      <template #actions>
        <UButton :to="`/app/manufacturing/work-orders/${route.params.id}`" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div v-if="wo" class="space-y-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 class="text-sm font-semibold">Record Labor</h3>
        <div class="grid grid-cols-2 gap-3">
          <UFormGroup label="Hours"><UInput v-model="labor.hours" type="number" step="0.01" /></UFormGroup>
          <UFormGroup label="Rate ($/hr)"><UInput v-model="labor.rate" type="number" step="0.01" /></UFormGroup>
        </div>
        <UButton size="sm" :loading="addingLabor" class="bg-indigo-600" @click="addLabor">Add Labor Entry</UButton>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h3 class="text-sm font-semibold mb-3">Complete Work Order</h3>
        <UFormGroup label="Quantity Produced">
          <UInput v-model="produced" type="number" min="0.0001" step="any" :placeholder="String(wo.quantity_planned)" />
        </UFormGroup>
        <div class="mt-4">
          <UButton :loading="completing" class="bg-indigo-600 hover:bg-indigo-700" @click="complete">Complete & Post to Inventory</UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const wo = ref<any>(null)
const labor = reactive({ hours: '', rate: '' })
const produced = ref('')
const addingLabor = ref(false)
const completing = ref(false)
const error = ref('')
onMounted(async () => { wo.value = await request<any>(`/manufacturing/work-orders/${route.params.id}`) })
async function addLabor() {
  addingLabor.value = true
  try {
    await request(`/manufacturing/work-orders/${route.params.id}/labor`, {
      method: 'POST',
      body: { hours: Number(labor.hours), rate_cents: dollarsToCents(Number(labor.rate)), recorded_at: new Date().toISOString() },
    })
    labor.hours = ''; labor.rate = ''
  }
  finally { addingLabor.value = false }
}
async function complete() {
  completing.value = true; error.value = ''
  try {
    await request(`/manufacturing/work-orders/${route.params.id}/complete`, {
      method: 'POST',
      body: { quantity_produced: Number(produced.value) || Number(wo.value.quantity_planned) },
    })
    await router.push(`/app/manufacturing/work-orders/${route.params.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { completing.value = false }
}
</script>
