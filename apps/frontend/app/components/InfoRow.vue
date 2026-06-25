<template>
  <div class="flex justify-between py-2.5 border-b border-gray-100 last:border-0">
    <span class="text-sm text-gray-500">{{ label }}</span>
    <span class="text-sm font-medium text-gray-900 text-right max-w-xs truncate" :class="mono ? 'font-mono' : ''">
      {{ value ?? '—' }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value?: string | number | null; mono?: boolean }>()
</script>
