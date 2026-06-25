<template>
  <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>
    <div v-else-if="rows.length === 0" class="py-12 text-center text-sm text-gray-400">
      No records found
    </div>
    <UTable v-else :columns="columns" :rows="rows">
      <template v-for="col in columns" :key="col.key" #[`${col.key}-data`]="{ row }">
        <slot :name="col.key" :row="row">
          {{ getNestedValue(row, col.key) }}
        </slot>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  columns: { key: string; label: string }[]
  rows: any[]
  loading?: boolean
}>()

function getNestedValue(obj: any, path: string) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? ''
}
</script>
