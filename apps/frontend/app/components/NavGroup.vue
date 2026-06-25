<template>
  <div class="mt-4">
    <p class="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">{{ label }}</p>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string }>()
</script>
