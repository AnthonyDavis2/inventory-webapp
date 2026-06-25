<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <header class="h-14 border-b border-gray-200 bg-white flex items-center px-6 justify-between">
      <span class="text-indigo-600 font-bold text-lg">Inventory</span>
      <a href="mailto:support@example.com" class="text-sm text-gray-500 hover:text-gray-700">Need help? Contact</a>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center px-4 py-10">
      <div class="w-full max-w-lg">
        <slot />
      </div>

      <div class="mt-8 flex flex-col items-center gap-2">
        <div class="flex gap-2">
          <span
            v-for="i in 7"
            :key="i"
            class="w-2.5 h-2.5 rounded-full transition-colors"
            :class="i <= currentStep ? 'bg-indigo-600' : 'bg-gray-200'"
          />
        </div>
        <p class="text-xs text-gray-400">Step {{ currentStep }} of 7 — {{ stepLabel }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const currentStep = computed(() => Number(route.params.step) || 1)

const stepLabels: Record<number, string> = {
  1: 'Organization Profile',
  2: 'Units of Measure',
  3: 'Warehouse Setup',
  4: 'Tax Settings',
  5: 'Costing Method',
  6: 'Chart of Accounts',
  7: 'Invite Team',
}
const stepLabel = computed(() => stepLabels[currentStep.value] ?? '')
</script>
