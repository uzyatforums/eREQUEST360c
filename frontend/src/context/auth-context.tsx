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
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = React.useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(true)

  const logout = React.useCallback(() => {
    authService.removeToken()
    setCurrentUser(null)
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
    } catch {
      logout()
    } finally {
      setIsLoading(false)
    }
  }, [logout])

  const login = React.useCallback(
    async (username: string, password: string) => {
      setIsLoading(true)
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

  React.useEffect(() => {
    registerUnauthorizedHandler(() => {
      logout()
    })
    refreshUser()
  }, [refreshUser, logout])

  const value: AuthContextType = {
    currentUser,
    roles: currentUser?.roles || [],
    tenant: currentUser?.client_id || null,
    branch: currentUser?.branch_code || null,
    isAuthenticated: !!currentUser,
    isLoading,
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
