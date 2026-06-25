export function useApi() {
  const config = useRuntimeConfig()

  async function request<T>(path: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    return $fetch<T>(`${config.public.apiUrl}${path}`, {
      credentials: 'include',
      ...options,
    })
  }

  return { request }
}
