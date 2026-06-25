<template>
  <div class="bg-white rounded-xl border border-gray-200 p-8">
    <!-- Step 1: Org Profile -->
    <template v-if="step === 1">
      <h2 class="text-2xl font-semibold text-gray-950">Set up your organization</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">This appears on your invoices and purchase orders.</p>
      <form class="space-y-4" @submit.prevent="submitStep1">
        <UFormGroup label="Company name">
          <UInput v-model="step1.name" required />
        </UFormGroup>
        <UFormGroup label="Business email">
          <UInput v-model="step1.email" type="email" />
        </UFormGroup>
        <UFormGroup label="Address">
          <UInput v-model="step1.address_line1" placeholder="123 Industrial Blvd" />
        </UFormGroup>
        <div class="grid grid-cols-3 gap-3">
          <UFormGroup label="City" class="col-span-1">
            <UInput v-model="step1.city" />
          </UFormGroup>
          <UFormGroup label="State">
            <UInput v-model="step1.state" maxlength="2" placeholder="TX" />
          </UFormGroup>
          <UFormGroup label="ZIP">
            <UInput v-model="step1.zip" placeholder="75201" />
          </UFormGroup>
        </div>
        <StepActions :loading="loading" :step="1" :is-first="true" />
      </form>
    </template>

    <!-- Step 2: UOM -->
    <template v-else-if="step === 2">
      <h2 class="text-2xl font-semibold text-gray-950">Which units do you work with?</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">Select the units you'll use for products, purchasing, and manufacturing.</p>
      <div class="space-y-4">
        <div v-for="group in uomGroups" :key="group.label">
          <p class="text-xs font-medium text-gray-500 uppercase mb-2">{{ group.label }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="u in group.units"
              :key="u.symbol"
              type="button"
              class="border rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors"
              :class="selectedUoms.has(u.symbol)
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'"
              @click="toggleUom(u.symbol)"
            >
              <span class="font-medium">{{ u.symbol }}</span>
              <span class="ml-1 text-gray-500">{{ u.name }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="mt-6">
        <StepActions :loading="loading" :step="2" @submit="submitStep2" />
      </div>
    </template>

    <!-- Step 3: Warehouse -->
    <template v-else-if="step === 3">
      <h2 class="text-2xl font-semibold text-gray-950">Set up your first warehouse</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">You can add more warehouses later.</p>
      <form class="space-y-4" @submit.prevent="submitStep3">
        <UFormGroup label="Warehouse name">
          <UInput v-model="step3.name" placeholder="Main Warehouse" required />
        </UFormGroup>
        <UFormGroup label="Code (used on documents)">
          <UInput v-model="step3.code" placeholder="MAIN" required />
        </UFormGroup>
        <div class="border border-gray-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <UToggle v-model="step3.bins_enabled" />
            <div>
              <p class="text-sm font-medium text-gray-900">Track bin locations</p>
              <p class="text-xs text-gray-500 mt-1">Enables aisle / rack / shelf tracking. Can't be disabled after first inventory receipt.</p>
            </div>
          </div>
        </div>
        <StepActions :loading="loading" :step="3" />
      </form>
    </template>

    <!-- Step 4: Tax -->
    <template v-else-if="step === 4">
      <h2 class="text-2xl font-semibold text-gray-950">Do you collect sales tax?</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">This sets your default tax behavior on sales orders.</p>
      <div class="space-y-3">
        <button
          v-for="opt in taxOptions"
          :key="String(opt.value)"
          type="button"
          class="w-full border rounded-lg p-4 text-left transition-colors"
          :class="step4.collects_tax === opt.value
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 hover:border-gray-300'"
          @click="step4.collects_tax = opt.value"
        >
          <p class="text-sm font-medium">{{ opt.label }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ opt.description }}</p>
          <div v-if="opt.value && step4.collects_tax" class="mt-3">
            <UFormGroup label="Default rate (%)">
              <UInput v-model="step4.default_tax_rate" type="number" step="0.01" min="0" max="100" placeholder="8.25" />
            </UFormGroup>
          </div>
        </button>
      </div>
      <div class="mt-6">
        <StepActions :loading="loading" :step="4" @submit="submitStep4" />
      </div>
    </template>

    <!-- Step 5: Costing -->
    <template v-else-if="step === 5">
      <h2 class="text-2xl font-semibold text-gray-950">How should we value your inventory?</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">This can't be changed after your first inventory transaction.</p>
      <div class="space-y-3">
        <button
          v-for="method in costingMethods"
          :key="method.value"
          type="button"
          class="w-full border rounded-lg p-4 text-left transition-colors"
          :class="step5.costing_method === method.value
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-200 hover:border-gray-300'"
          @click="step5.costing_method = method.value"
        >
          <p class="text-sm font-medium">{{ method.label }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ method.description }}</p>
        </button>
      </div>
      <div class="mt-6">
        <StepActions :loading="loading" :step="5" @submit="submitStep5" />
      </div>
    </template>

    <!-- Step 6: Chart of Accounts -->
    <template v-else-if="step === 6">
      <h2 class="text-2xl font-semibold text-gray-950">Your chart of accounts</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">Pre-set with standard US accounts. System accounts are protected.</p>
      <p class="text-sm text-gray-600 mb-6">Your chart of accounts has been seeded automatically with standard US accounts. You can customize it later in Settings → Accounts.</p>
      <StepActions :loading="loading" :step="6" @submit="submitStep6" />
    </template>

    <!-- Step 7: Invite Team -->
    <template v-else-if="step === 7">
      <h2 class="text-2xl font-semibold text-gray-950">Invite your team</h2>
      <p class="text-sm text-gray-500 mt-1 mb-6">Optional — you can do this from Settings later. Invitations expire after 72 hours.</p>
      <div class="space-y-3">
        <div v-for="(invite, i) in invites" :key="i" class="flex gap-3">
          <UInput v-model="invite.email" type="email" placeholder="colleague@company.com" class="flex-1" />
          <USelect v-model="invite.role" :options="roleOptions" option-attribute="label" value-attribute="value" class="w-40" />
        </div>
        <button type="button" class="text-sm text-indigo-600 hover:underline" @click="addInvite">
          + Add another person
        </button>
      </div>
      <div class="mt-6 flex items-center justify-between">
        <button type="button" class="text-sm text-gray-500" @click="goBack">← Back</button>
        <div class="flex gap-3">
          <UButton variant="ghost" @click="finish">Skip for now</UButton>
          <UButton :loading="loading" class="bg-indigo-600 hover:bg-indigo-700" @click="submitStep7">
            Finish Setup →
          </UButton>
        </div>
      </div>
    </template>

    <!-- Complete -->
    <template v-else-if="step === 8">
      <div class="text-center">
        <p class="text-2xl font-semibold">✦ You're set up</p>
        <p class="text-sm text-gray-500 mt-2">Your 14-day free trial is active.</p>
        <div class="mt-8 grid grid-cols-2 gap-3">
          <NuxtLink to="/app/products/new" class="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 text-sm font-medium text-left">
            Add products
          </NuxtLink>
          <NuxtLink to="/app/products/import" class="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 text-sm font-medium text-left">
            Import from CSV
          </NuxtLink>
          <NuxtLink to="/app/vendors/new" class="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 text-sm font-medium text-left">
            Add vendors
          </NuxtLink>
          <NuxtLink to="/app/customers/new" class="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 text-sm font-medium text-left">
            Add customers
          </NuxtLink>
        </div>
        <NuxtLink to="/app/dashboard" class="mt-6 block text-sm text-indigo-600 hover:underline">
          Go to Dashboard →
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'onboarding', middleware: 'auth' })

const route = useRoute()
const { request } = useApi()
const auth = useAuthStore()

const step = computed(() => Number(route.params.step))
const loading = ref(false)

// Step 1
const step1 = reactive({ name: '', email: '', address_line1: '', city: '', state: '', zip: '' })

async function submitStep1() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', {
      method: 'PATCH',
      body: { step: 1, ...step1 },
    })
    await navigateTo('/onboarding/2')
  }
  finally { loading.value = false }
}

// Step 2
const uomGroups = [
  { label: 'Weight', units: [{ symbol: 'lb', name: 'pound' }, { symbol: 'oz', name: 'ounce' }, { symbol: 'kg', name: 'kilogram' }, { symbol: 'g', name: 'gram' }] },
  { label: 'Volume', units: [{ symbol: 'gal', name: 'gallon' }, { symbol: 'fl oz', name: 'fl ounce' }, { symbol: 'L', name: 'liter' }] },
  { label: 'Count & Packaging', units: [{ symbol: 'ea', name: 'each' }, { symbol: 'case', name: 'case' }, { symbol: 'box', name: 'box' }, { symbol: 'pallet', name: 'pallet' }] },
  { label: 'Length', units: [{ symbol: 'in', name: 'inch' }, { symbol: 'ft', name: 'foot' }, { symbol: 'm', name: 'meter' }] },
]
const selectedUoms = reactive(new Set<string>(['ea', 'lb', 'oz']))
function toggleUom(symbol: string) {
  if (selectedUoms.has(symbol)) selectedUoms.delete(symbol)
  else selectedUoms.add(symbol)
}

async function submitStep2() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', {
      method: 'PATCH',
      body: { step: 2, selected_uoms: [...selectedUoms] },
    })
    await navigateTo('/onboarding/3')
  }
  finally { loading.value = false }
}

// Step 3
const step3 = reactive({ name: 'Main Warehouse', code: 'MAIN', bins_enabled: false })

async function submitStep3() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', {
      method: 'PATCH',
      body: { step: 3, ...step3 },
    })
    await navigateTo('/onboarding/4')
  }
  finally { loading.value = false }
}

// Step 4
const taxOptions = [
  { value: false, label: 'No — I sell B2B with resale certificates', description: 'Most wholesalers and manufacturers fall here.' },
  { value: true, label: 'Yes — I charge sales tax to customers', description: 'Set a default rate. You can override per customer or per order.' },
]
const step4 = reactive({ collects_tax: false, default_tax_rate: '' })

async function submitStep4() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', {
      method: 'PATCH',
      body: {
        step: 4,
        collects_sales_tax: step4.collects_tax,
        default_tax_rate: step4.default_tax_rate ? Number(step4.default_tax_rate) : undefined,
      },
    })
    await navigateTo('/onboarding/5')
  }
  finally { loading.value = false }
}

// Step 5
const costingMethods = [
  { value: 'FIFO', label: 'FIFO · First In, First Out', description: 'Each purchase creates a cost layer. Sales use the oldest costs first. Best for lot-tracked & expiring products.' },
  { value: 'WAC', label: 'Weighted Average Cost', description: 'All units share one running average cost that updates on every purchase receipt. Simpler, better for high-volume commodity products.' },
]
const step5 = reactive({ costing_method: 'FIFO' })

async function submitStep5() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', {
      method: 'PATCH',
      body: { step: 5, costing_method: step5.costing_method },
    })
    await navigateTo('/onboarding/6')
  }
  finally { loading.value = false }
}

// Step 6
async function submitStep6() {
  loading.value = true
  try {
    await request('/organizations/me/onboarding', { method: 'PATCH', body: { step: 6 } })
    await navigateTo('/onboarding/7')
  }
  finally { loading.value = false }
}

// Step 7
const roleOptions = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Sales Staff', value: 'SALES' },
  { label: 'Warehouse Staff', value: 'WAREHOUSE' },
  { label: 'Accountant', value: 'ACCOUNTANT' },
]
const invites = reactive([{ email: '', role: 'WAREHOUSE' }, { email: '', role: 'SALES' }])
function addInvite() { invites.push({ email: '', role: 'WAREHOUSE' }) }

async function submitStep7() {
  loading.value = true
  try {
    const validInvites = invites.filter(i => i.email.trim())
    for (const invite of validInvites) {
      await request('/users/invite', { method: 'POST', body: invite })
    }
    await request('/organizations/me/onboarding', { method: 'PATCH', body: { step: 7 } })
    await finish()
  }
  finally { loading.value = false }
}

async function finish() {
  auth.onboarding_complete = true
  await navigateTo('/onboarding/8')
}

function goBack() {
  navigateTo(`/onboarding/${step.value - 1}`)
}
</script>
