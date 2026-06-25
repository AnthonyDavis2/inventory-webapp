<template>
  <div class="max-w-2xl">
    <PageHeader title="New Inventory Adjustment">
      <template #actions>
        <UButton to="/app/inventory/adjustments" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>

    <UAlert v-if="error" color="red" :description="error" class="mb-4" />

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Warehouse" required>
          <USelect v-model="form.warehouse_id" :options="warehouses" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Adjustment Type" required>
          <USelect v-model="form.adjustment_type" :options="adjTypes" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>

      <UFormGroup label="Notes">
        <UInput v-model="form.notes" placeholder="Reason for adjustment" />
      </UFormGroup>

      <div class="border-t border-gray-100 pt-4">
        <h3 class="text-sm font-semibold mb-3">Lines</h3>
        <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-3 gap-3 mb-3">
          <USelect v-model="line.product_id" :options="products" option-attribute="label" value-attribute="value" placeholder="Product" />
          <UInput v-model="line.quantity" type="number" placeholder="Qty (+ or -)" />
          <UInput v-model="line.unit_cost" type="number" step="0.01" placeholder="Unit cost $" />
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="addLine">+ Add line</button>
      </div>

      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">
          Post Adjustment
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { dollarsToCents } from '~/shared/utils/currency'

definePageMeta({ layout: 'app', middleware: 'auth' })

const { request } = useApi()
const router = useRouter()

const form = reactive({
  warehouse_id: '',
  adjustment_type: 'INVENTORY_ADJUSTMENT',
  notes: '',
  lines: [{ product_id: '', quantity: '', unit_cost: '' }],
})
const loading = ref(false)
const error = ref('')
const warehouses = ref<{ label: string; value: string }[]>([])
const products = ref<{ label: string; value: string }[]>([])

const adjTypes = [
  { label: 'Inventory Adjustment', value: 'INVENTORY_ADJUSTMENT' },
  { label: 'Opening Balance', value: 'OPENING_BALANCE' },
  { label: 'Damaged', value: 'DAMAGED' },
  { label: 'Expired', value: 'EXPIRED' },
]

onMounted(async () => {
  const [wh, prod] = await Promise.all([
    request<{ data: any[] }>('/warehouses').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
  ])
  warehouses.value = (wh as any).data.map((w: any) => ({ label: w.name, value: w.id }))
  products.value = (prod as any).data.map((p: any) => ({ label: `${p.sku} – ${p.name}`, value: p.id }))
})

function addLine() {
  form.lines.push({ product_id: '', quantity: '', unit_cost: '' })
}

async function save() {
  loading.value = true
  error.value = ''
  try {
    await request('/inventory/adjustments', {
      method: 'POST',
      body: {
        warehouse_id: form.warehouse_id,
        adjustment_type: form.adjustment_type,
        notes: form.notes,
        lines: form.lines.filter(l => l.product_id && l.quantity).map(l => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_cost_cents: l.unit_cost ? dollarsToCents(Number(l.unit_cost)) : 0,
        })),
      },
    })
    await router.push('/app/inventory/adjustments')
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to post adjustment'
  }
  finally { loading.value = false }
}
</script>
