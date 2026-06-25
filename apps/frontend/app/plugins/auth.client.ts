// Attempt a silent token refresh on first load so page refreshes don't flash login
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  if (!auth.isAuthenticated) {
    await auth.refresh()
  }
})
