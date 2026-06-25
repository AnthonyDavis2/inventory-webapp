<template>
  <div v-if="priceList">
    <PageHeader :title="priceList.name">
      <template #actions>
        <UButton size="sm" class="bg-indigo-600 hover:bg-indigo-700" @click="showEntryForm = true">+ Add Entry</UButton>
      </template>
    </PageHeader>

    <div v-if="showEntryForm" class="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <h3 class="text-sm font-semibold mb-3">Add Price Entry</h3>
      <div class="grid grid-cols-3 gap-3">
        <USelect v-model="newEntry.product_id" :options="products" option-attribute="label" value-attribute="value" placeholder="Product" />
        <UInput v-model="newEntry.flat_price" type="number" step="0.01" min="0" placeholder="Price $" />
        <div class="flex gap-2">
          <UButton :loading="addingEntry" class="bg-indigo-600" @click="addEntry">Add</UButton>
          <UButton variant="outline" @click="showEntryForm = false">Cancel</UButton>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
        <h3 class="text-sm font-semibold">Price Entries</h3>
        <UBadge v-if="priceList.is_default" label="Default" color="green" variant="soft" />
      </div>
      <div v-if="entries.length === 0" class="py-8 text-center text-sm text-gray-400">No price entries yet</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="px-4 py-2 text-left">Product</th>
            <th class="px-4 py-2 text-left">SKU</th>
            <th class="px-4 py-2 text-right">Price</th>
            <th class="px-4 py-2" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="entry in entries" :key="entry.id">
            <td class="px-4 py-3">{{ entry.product?.name }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ entry.product?.sku }}</td>
            <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(entry.flat_price_cents) }}</td>
            <td class="px-4 py-3 text-right">
              <UButton variant="ghost" size="xs" color="red" icon="i-heroicons-trash" @click="removeEntry(entry.id)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency, dollarsToCents } from '~/shared/utils/currency'
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const priceList = ref<any>(null)
const entries = ref<any[]>([])
const showEntryForm = ref(false)
const newEntry = reactive({ product_id: '', flat_price: '' })
const addingEntry = ref(false)
const products = ref<{ label: string; value: string }[]>([])
onMounted(async () => {
  const [pl, prod] = await Promise.all([
    request<any>(`/price-lists/${route.params.id}`),
    request<{ data: any[] }>('/products', { query: { limit: 200 } }).catch(() => ({ data: [] })),
  ])
  priceList.value = pl
  entries.value = pl.entries ?? []
  products.value = (prod as any).data.map((p: any) => ({ label: `${p.sku} – ${p.name}`, value: p.id }))
})
async function addEntry() {
  addingEntry.value = true
  try {
    const entry = await request<any>(`/price-lists/${route.params.id}/entries`, {
      method: 'POST',
      body: { product_id: newEntry.product_id, rule_type: 'FLAT', flat_price_cents: dollarsToCents(Number(newEntry.flat_price)) },
    })
    entries.value.push(entry); newEntry.product_id = ''; newEntry.flat_price = ''; showEntryForm.value = false
  }
  finally { addingEntry.value = false }
}
async function removeEntry(entryId: string) {
  await request(`/price-lists/${route.params.id}/entries/${entryId}`, { method: 'DELETE' })
  entries.value = entries.value.filter(e => e.id !== entryId)
}
</script>
