<template>
  <div>
    <PageHeader title="Reports" />
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-for="report in reports" :key="report.to" :to="report.to" class="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 transition-colors">
        <UIcon :name="report.icon" class="w-5 h-5 text-indigo-500 mb-2" />
        <p class="text-sm font-medium text-gray-900">{{ report.label }}</p>
        <p class="text-xs text-gray-500 mt-0.5">{{ report.desc }}</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'app', middleware: 'auth' })
const reports = [
  { to: '/app/reports/inventory-valuation', icon: 'i-heroicons-archive-box', label: 'Inventory Valuation', desc: 'Current value of all stock' },
  { to: '/app/reports/aged-receivables', icon: 'i-heroicons-currency-dollar', label: 'Aged Receivables', desc: 'Outstanding customer balances' },
  { to: '/app/reports/customer-profitability', icon: 'i-heroicons-user-group', label: 'Customer Profitability', desc: 'Revenue, cost, and margin by customer' },
  { to: '/app/reports/work-order-cost', icon: 'i-heroicons-wrench-screwdriver', label: 'Work Order Cost', desc: 'Variance analysis for production' },
  { to: '/app/reports/purchase-history', icon: 'i-heroicons-shopping-cart', label: 'Purchase History', desc: 'Spend by vendor' },
  { to: '/app/reports/expense', icon: 'i-heroicons-banknotes', label: 'Expense Report', desc: 'Operating expenses by category' },
]
</script>
