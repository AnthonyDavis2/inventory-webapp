import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  org_id: string
  mfa_enabled: boolean
}

interface AuthState {
  user: User | null
  accessToken: string | null
  onboarding_complete: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    onboarding_complete: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isOwner: (state) => state.user?.role === 'OWNER',
    isAdmin: (state) => ['OWNER', 'ADMIN'].includes(state.user?.role ?? ''),
  },

  actions: {
    setAuth(token: string, user: User, onboardingComplete: boolean) {
      this.accessToken = token
      this.user = user
      this.onboarding_complete = onboardingComplete
    },

    clearAuth() {
      this.accessToken = null
      this.user = null
      this.onboarding_complete = false
    },

    async refresh() {
      try {
        const data = await $fetch<{ access_token: string; user: User; onboarding_complete: boolean }>(
          `${useRuntimeConfig().public.apiUrl}/auth/refresh`,
          { method: 'POST', credentials: 'include' },
        )
        this.setAuth(data.access_token, data.user, data.onboarding_complete)
        return true
      }
      catch {
        this.clearAuth()
        return false
      }
    },

    async logout() {
      try {
        await $fetch(`${useRuntimeConfig().public.apiUrl}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        })
      }
      catch {}
      this.clearAuth()
      await navigateTo('/login')
    },
  },
})
