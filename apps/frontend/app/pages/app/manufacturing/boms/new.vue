<template>
  <div class="max-w-3xl">
    <PageHeader title="New Bill of Materials">
      <template #actions>
        <UButton to="/app/manufacturing/boms" variant="outline" size="sm">Cancel</UButton>
      </template>
    </PageHeader>
    <UAlert v-if="error" color="red" :description="error" class="mb-4" />
    <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <UFormGroup label="Product (Output)" required>
          <USelect v-model="form.product_id" :options="products" option-attribute="label" value-attribute="value" />
        </UFormGroup>
        <UFormGroup label="BOM Name" required>
          <UInput v-model="form.name" placeholder="Standard BOM v1" />
        </UFormGroup>
      </div>
      <div class="border-t border-gray-100 pt-5">
        <h3 class="text-sm font-semibold mb-3">Components</h3>
        <div v-for="(line, i) in form.lines" :key="i" class="grid grid-cols-3 gap-3 mb-3 items-end">
          <UFormGroup label="Component" class="col-span-1">
            <USelect v-model="line.component_id" :options="products" option-attribute="label" value-attribute="value" />
          </UFormGroup>
          <UFormGroup label="Qty">
            <UInput v-model="line.quantity" type="number" min="0.000001" step="any" />
          </UFormGroup>
          <UFormGroup label="UOM">
            <USelect v-model="line.uom_id" :options="uoms" option-attribute="label" value-attribute="value" />
          </UFormGroup>
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="form.lines.push({ component_id: '', quantity: '', uom_id: '' })">+ Add component</button>
      </div>
      <div class="flex justify-end pt-4 border-t border-gray-100">
        <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="save">Create BOM</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const { request } = useApi()
const router = useRouter()
const form = reactive({ product_id: '', name: '', lines: [{ component_id: '', quantity: '', uom_id: '' }] })
const loading = ref(false)
const error = ref('')
const products = ref<{ label: string; value: string }[]>([])
const uoms = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const [p, u] = await Promise.all([
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
    request<{ data: any[] }>('/uom').catch(() => ({ data: [] })),
  ])
  products.value = (p as any).data.map((x: any) => ({ label: `${x.sku} – ${x.name}`, value: x.id }))
  uoms.value = (u as any).data.map((x: any) => ({ label: `${x.name} (${x.symbol})`, value: x.id }))
})
async function save() {
  loading.value = true; error.value = ''
  try {
    const bom = await request<any>('/manufacturing/boms', {
      method: 'POST',
      body: {
        product_id: form.product_id, name: form.name,
        lines: form.lines.filter(l => l.component_id && l.quantity).map(l => ({
          component_id: l.component_id, quantity: Number(l.quantity), uom_id: l.uom_id,
        })),
      },
    })
    await router.push(`/app/manufacturing/boms/${bom.id}`)
  }
  catch (e: any) { error.value = e?.data?.message ?? 'Failed' }
  finally { loading.value = false }
}
</script>
