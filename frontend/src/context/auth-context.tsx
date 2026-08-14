import * as React from 'react'
import { UserInfo } from '../types'
import { apiService } from '../services/api'
import { authService } from '../services/auth'
import { registerUnauthorizedHandler } from '../services/apiClient'

interface AuthContextType {
  currentUser: UserInfo | null
  roles: string[]
  tenant: number | null
  branch: string | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpiredMessage: string | null
  clearSessionExpiredMessage: () => void
  login: (username: string, password: string) => Promise<void>
  logout: (reason?: string) => void
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = React.useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)
  const [sessionExpiredMessage, setSessionExpiredMessage] = React.useState<string | null>(null)
  const [timeoutMinutes, setTimeoutMinutes] = React.useState<number>(5)

  const timerRef = React.useRef<number | null>(null)
  const lastActivityRef = React.useRef<number>(Date.now())

  const clearSessionExpiredMessage = React.useCallback(() => {
    setSessionExpiredMessage(null)
  }, [])

  const logout = React.useCallback((reason?: string) => {
    authService.removeToken()
    setCurrentUser(null)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (reason) {
      setSessionExpiredMessage(reason)
    }
  }, [])

  const refreshUser = React.useCallback(async () => {
    if (!authService.hasToken()) {
      setCurrentUser(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const user = await apiService.getCurrentUser()
      setCurrentUser(user)
      const config = await apiService.getSessionConfig().catch(() => ({ inactivity_timeout_minutes: 5, inactivity_timeout_seconds: 300 }))
      setTimeoutMinutes(config.inactivity_timeout_minutes || 5)
    } catch {
      logout('Session expired. Please log in again.')
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  const login = React.useCallback(
    async (username: string, password: string) => {
      setIsLoading(true)
      setSessionExpiredMessage(null)
      try {
        await apiService.login(username, password)
        await refreshUser()
      } catch (err) {
        setIsLoading(false)
        throw err
      }
    },
    [refreshUser]
  )

  // Inactivity activity tracking and proactive timer
  const resetInactivityTimer = React.useCallback(() => {
    lastActivityRef.current = Date.now()
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
    }
    if (currentUser && timeoutMinutes > 0) {
      const ms = timeoutMinutes * 60 * 1000
      timerRef.current = window.setTimeout(() => {
        logout('Session expired due to inactivity. Please log in again.')
      }, ms)
    }
  }, [currentUser, timeoutMinutes, logout])

  React.useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout('Session expired due to inactivity. Please log in again.')
    })
    refreshUser()
  }, [refreshUser, logout])

  React.useEffect(() => {
    if (!currentUser) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    resetInactivityTimer()

    let lastThrottle = 0
    const handleUserActivity = () => {
      const now = Date.now()
      if (now - lastThrottle > 2000) {
        lastThrottle = now
        resetInactivityTimer()
      }
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }))

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity))
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [currentUser, resetInactivityTimer])

  const value: AuthContextType = {
    currentUser,
    roles: currentUser?.roles || [],
    tenant: currentUser?.client_id || null,
    branch: currentUser?.branch_code || null,
    isAuthenticated: !!currentUser,
    isLoading,
    sessionExpiredMessage,
    clearSessionExpiredMessage,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
