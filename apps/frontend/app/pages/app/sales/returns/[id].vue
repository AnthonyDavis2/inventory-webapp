<template>
  <div v-if="rma">
    <PageHeader :title="rma.rma_number">
      <template #actions>
        <UButton v-if="rma.status === 'PENDING'" :loading="receiving" class="bg-indigo-600 hover:bg-indigo-700" size="sm" @click="receive">Mark Received</UButton>
      </template>
    </PageHeader>
    <InfoCard title="RMA Details">
      <InfoRow label="Status" :value="rma.status" />
      <InfoRow label="SO Number" :value="rma.so?.so_number" />
      <InfoRow label="Reason" :value="rma.reason" />
    </InfoCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const route = useRoute()
const { request } = useApi()
const rma = ref<any>(null)
const receiving = ref(false)
onMounted(async () => { rma.value = await request<any>(`/rmas/${route.params.id}`) })
async function receive() {
  receiving.value = true
  try { rma.value = await request<any>(`/rmas/${route.params.id}/receive`, { method: 'POST' }) }
  finally { receiving.value = false }
}
</script>
