export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // Public routes
  const publicRoutes = ['/login', '/register', '/forgot-password']
  const isPublicRoute = publicRoutes.includes(to.path)
    || to.path.startsWith('/reset-password')
    || to.path.startsWith('/accept-invite')
    || to.path === '/verify-mfa'

  if (isPublicRoute) return

  // Try to use existing token or refresh
  if (!auth.isAuthenticated) {
    const ok = await auth.refresh()
    if (!ok) {
      return navigateTo('/login')
    }
  }

  // Redirect onboarding-incomplete users
  if (!auth.onboarding_complete && !to.path.startsWith('/onboarding')) {
    return navigateTo('/onboarding/1')
  }

  // Redirect onboarding-complete users away from onboarding
  if (auth.onboarding_complete && to.path.startsWith('/onboarding')) {
    return navigateTo('/app/dashboard')
  }
})
