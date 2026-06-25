<template>
  <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
    <p class="text-sm text-gray-500">
      Showing {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, total) }} of {{ total }}
    </p>
    <div class="flex gap-1">
      <UButton
        size="sm"
        variant="outline"
        :disabled="page <= 1"
        icon="i-heroicons-chevron-left"
        @click="prev"
      />
      <UButton
        size="sm"
        variant="outline"
        :disabled="page >= totalPages"
        icon="i-heroicons-chevron-right"
        @click="next"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ page: number; total: number; perPage: number }>()
const emit = defineEmits<{ 'update:page': [number]; change: [] }>()

const totalPages = computed(() => Math.ceil(props.total / props.perPage))

function prev() {
  emit('update:page', props.page - 1)
  emit('change')
}
function next() {
  emit('update:page', props.page + 1)
  emit('change')
}
</script>
