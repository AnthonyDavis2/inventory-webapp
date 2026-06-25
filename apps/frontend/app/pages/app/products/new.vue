<template>
  <div class="max-w-2xl">
    <PageHeader title="New Product">
      <template #actions>
        <UButton to="/app/products" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>

    <UAlert v-if="error" color="red" :description="error" class="mb-4" />

    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="SKU" required>
          <UInput v-model="form.sku" placeholder="WIDGET-001" />
        </UFormGroup>
        <UFormGroup label="Type" required>
          <USelect v-model="form.type" :options="typeOptions" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>

      <UFormGroup label="Name" required>
        <UInput v-model="form.name" placeholder="Product name" />
      </UFormGroup>

      <UFormGroup label="Description">
        <UTextarea v-model="form.description" :rows="3" />
      </UFormGroup>

      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Stocking UOM">
          <USelect v-model="form.stocking_uom_id" :options="uoms" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="Category">
          <USelect v-model="form.category_id" :options="categories" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Default Sale Price ($)">
          <UInput v-model="form.sale_price" type="number" step="0.01" min="0" placeholder="0.00" />
        </UFormGroup>
        <UFormGroup label="COGS Account">
          <USelect v-model="form.cogs_account_id" :options="accounts" option-attribute="label" value-attribute="value" />
        </UFormGroup>
      </div>

      <div class="flex gap-4">
        <UCheckbox v-model="form.lot_tracked" label="Lot tracked" />
        <UCheckbox v-model="form.serial_tracked" label="Serial tracked" />
      </div>

      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">
          Create Product
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
  sku: '', type: 'FINISHED_GOOD', name: '', description: '', stocking_uom_id: '',
  category_id: '', sale_price: '', cogs_account_id: '', lot_tracked: false, serial_tracked: false,
})
const loading = ref(false)
const error = ref('')
const uoms = ref<{ label: string; value: string }[]>([])
const categories = ref<{ label: string; value: string }[]>([])
const accounts = ref<{ label: string; value: string }[]>([])

const typeOptions = [
  { label: 'Finished Good', value: 'FINISHED_GOOD' },
  { label: 'Raw Material', value: 'RAW_MATERIAL' },
  { label: 'Semi-Finished', value: 'SEMI_FINISHED' },
  { label: 'Service', value: 'SERVICE' },
]

onMounted(async () => {
  const [uomData, catData] = await Promise.all([
    request<{ data: any[] }>('/uom').catch(() => ({ data: [] })),
    request<{ data: any[] }>('/products/categories').catch(() => ({ data: [] })),
  ])
  uoms.value = (uomData as any).data?.map((u: any) => ({ label: `${u.name} (${u.symbol})`, value: u.id })) ?? []
  categories.value = (catData as any).data?.map((c: any) => ({ label: c.name, value: c.id })) ?? []
})

async function save() {
  if (!form.sku || !form.name) { error.value = 'SKU and Name are required'; return }
  loading.value = true
  error.value = ''
  try {
    const { id } = await request<{ id: string }>('/products', {
      method: 'POST',
      body: {
        ...form,
        sale_price_cents: form.sale_price ? dollarsToCents(Number(form.sale_price)) : undefined,
        category_id: form.category_id || undefined,
        stocking_uom_id: form.stocking_uom_id || undefined,
        cogs_account_id: form.cogs_account_id || undefined,
      },
    })
    await router.push(`/app/products/${id}`)
  }
  catch (e: any) {
    error.value = e?.data?.message ?? 'Failed to create product'
  }
  finally { loading.value = false }
}
</script>
