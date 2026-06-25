<template>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-xl font-semibold text-gray-950">{{ title }}</h1>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
