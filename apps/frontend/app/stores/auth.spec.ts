import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

vi.mock('#app', () => ({
  useNuxtApp: () => ({ $fetch: vi.fn() }),
  navigateTo: vi.fn(),
  useRuntimeConfig: () => ({ public: { apiUrl: 'http://localhost:3001' } }),
}))

const mockUser = {
  id: 'user-1',
  email: 'jane@acme.com',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'OWNER',
  org_id: 'org-1',
  mfa_enabled: false,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts unauthenticated', () => {
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('sets authenticated state on setAuth', () => {
    const auth = useAuthStore()
    auth.setAuth('access-token-abc', mockUser, false)
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.user).toMatchObject({ email: 'jane@acme.com' })
    expect(auth.accessToken).toBe('access-token-abc')
  })

  it('clears state on clearAuth', () => {
    const auth = useAuthStore()
    auth.setAuth('token', mockUser, false)
    auth.clearAuth()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.accessToken).toBeNull()
  })

  it('isOwner returns true for OWNER role', () => {
    const auth = useAuthStore()
    auth.setAuth('tok', mockUser, false)
    expect(auth.isOwner).toBe(true)
  })

  it('isOwner returns false for ADMIN role', () => {
    const auth = useAuthStore()
    auth.setAuth('tok', { ...mockUser, role: 'ADMIN' }, false)
    expect(auth.isOwner).toBe(false)
  })

  it('isAdmin returns true for OWNER and ADMIN roles', () => {
    const auth = useAuthStore()
    auth.setAuth('tok', mockUser, false)
    expect(auth.isAdmin).toBe(true) // OWNER is included in isAdmin

    auth.setAuth('tok', { ...mockUser, role: 'ADMIN' }, false)
    expect(auth.isAdmin).toBe(true)
  })

  it('isAdmin returns false for non-admin roles', () => {
    const auth = useAuthStore()
    auth.setAuth('tok', { ...mockUser, role: 'WAREHOUSE' }, false)
    expect(auth.isAdmin).toBe(false)
  })

  it('stores onboarding_complete flag', () => {
    const auth = useAuthStore()
    auth.setAuth('tok', mockUser, true)
    expect(auth.onboarding_complete).toBe(true)
  })
})
