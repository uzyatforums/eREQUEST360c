import { authService } from './auth'

type UnauthorizedHandler = () => void
let onUnauthorizedCallback: UnauthorizedHandler | null = null

/**
 * Registers a global callback to invoke when any API request receives HTTP 401 Unauthorized.
 */
export const registerUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  onUnauthorizedCallback = handler
}

/**
 * Centralized HTTP API client for eREQUEST360.
 * Automatically attaches Authorization: Bearer <token> to every request.
 * Intercepts HTTP 401 Unauthorized errors and triggers global session cleanup.
 */
export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
    })

    if (res.status === 401) {
      authService.removeToken()
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback()
      }
      const errBody = await res.json().catch(() => ({ detail: 'Not authenticated' }))
      throw new Error(errBody.detail || 'Session expired or unauthenticated.')
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(errBody.detail || `API Request failed with status ${res.status}`)
    }

    return (await res.json()) as T
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network Error: Unable to connect to eREQUEST360 backend server.')
    }
    throw error
  }
}
