<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-3">
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ label }}</span>
      <UIcon :name="icon" class="w-4 h-4" :class="iconColor" />
    </div>
    <p class="text-2xl font-semibold text-gray-950">{{ value }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ label: string; value: string; icon: string; color?: 'yellow' | 'red' | 'green' }>()
const colorMap: Record<string, string> = { yellow: 'text-amber-500', red: 'text-red-500', green: 'text-green-500' }
const iconColor = computed(() => (props.color ? colorMap[props.color] : undefined) ?? 'text-indigo-500')
</script>
