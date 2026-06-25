<template>
  <div class="flex items-center justify-between pt-4 border-t border-gray-100">
    <button
      v-if="!isFirst"
      type="button"
      class="text-sm text-gray-500 hover:text-gray-700"
      @click="$router.back()"
    >
      ← Back
    </button>
    <span v-else />
    <UButton
      type="button"
      :loading="loading"
      class="bg-indigo-600 hover:bg-indigo-700"
      @click="emit('submit')"
    >
      Continue →
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{ step: number; loading?: boolean; isFirst?: boolean }>()
const emit = defineEmits<{ submit: [] }>()
</script>
