<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="flex flex-col w-64 bg-white border-r border-gray-200 shrink-0"
      :class="{ 'hidden md:flex': !sidebarOpen }"
    >
      <!-- Logo + Org -->
      <div class="h-14 flex items-center px-4 border-b border-gray-200">
        <span class="text-indigo-600 font-bold text-base">Inventory</span>
        <span class="ml-2 text-sm text-gray-500 truncate">{{ auth.user?.org_id ? '·' : '' }}</span>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <NavItem to="/app/dashboard" icon="i-heroicons-squares-2x2" label="Dashboard" />

        <NavGroup label="Operations">
          <NavItem to="/app/products" icon="i-heroicons-cube" label="Products" />
          <NavItem to="/app/inventory" icon="i-heroicons-chart-bar" label="Inventory" />
          <NavItem to="/app/warehouses" icon="i-heroicons-building-storefront" label="Warehouses" />
        </NavGroup>

        <NavGroup label="Buying">
          <NavItem to="/app/vendors" icon="i-heroicons-building-office" label="Vendors" />
          <NavItem to="/app/purchasing" icon="i-heroicons-shopping-cart" label="Purchasing" />
        </NavGroup>

        <NavGroup label="Selling">
          <NavItem to="/app/customers" icon="i-heroicons-user-group" label="Customers" />
          <NavItem to="/app/price-lists" icon="i-heroicons-currency-dollar" label="Price Lists" />
          <NavItem to="/app/sales" icon="i-heroicons-receipt-percent" label="Sales" />
          <NavItem to="/app/invoices" icon="i-heroicons-document-text" label="Invoices" />
        </NavGroup>

        <NavGroup label="Production">
          <NavItem to="/app/manufacturing" icon="i-heroicons-wrench-screwdriver" label="Manufacturing" />
          <NavItem to="/app/costing" icon="i-heroicons-calculator" label="Costing" />
        </NavGroup>

        <NavGroup label="Finance">
          <NavItem to="/app/expenses" icon="i-heroicons-banknotes" label="Expenses" />
          <NavItem to="/app/reports" icon="i-heroicons-presentation-chart-line" label="Reports" />
        </NavGroup>
      </nav>

      <!-- Bottom actions -->
      <div class="border-t border-gray-200 px-3 py-3 space-y-0.5">
        <NavItem to="/app/notifications" icon="i-heroicons-bell" label="Notifications">
          <template #badge>
            <span v-if="unreadCount > 0" class="ml-auto bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </template>
        </NavItem>
        <NavItem to="/app/settings" icon="i-heroicons-cog-6-tooth" label="Settings" />
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          @click="auth.logout()"
        >
          <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Top bar (mobile) -->
      <header class="md:hidden h-14 flex items-center px-4 border-b border-gray-200 bg-white">
        <button @click="sidebarOpen = !sidebarOpen">
          <UIcon name="i-heroicons-bars-3" class="w-5 h-5" />
        </button>
        <span class="ml-3 text-indigo-600 font-bold">Inventory</span>
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()
const sidebarOpen = ref(false)
const unreadCount = ref(0)

onMounted(async () => {
  try {
    const data = await useApi().request<{ count: number }>('/notifications/unread-count')
    unreadCount.value = data.count
  }
  catch {}
})
</script>
