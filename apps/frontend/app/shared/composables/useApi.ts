import type { FetchOptions } from 'ofetch'

export function useApi() {
  const config = useRuntimeConfig()

  async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    return $fetch<T>(`${config.public.apiUrl}${path}`, {
      credentials: 'include',
      ...options,
    })
  }

  return { request }
}
