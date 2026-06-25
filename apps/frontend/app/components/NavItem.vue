<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors"
    :class="isActive
      ? 'bg-indigo-50 text-indigo-700 font-medium'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
  >
    <UIcon :name="icon" class="w-4 h-4 shrink-0" />
    <span class="truncate">{{ label }}</span>
    <slot name="badge" />
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{ to: string; icon: string; label: string }>()
const route = useRoute()
const isActive = computed(() => route.path.startsWith(props.to))
</script>
