import * as React from 'react'
import { apiService } from '../services/api'
import { useAuth } from './auth-context'

interface WorkQueueContextType {
  pendingCount: number
  refreshPendingCount: () => Promise<void>
}

const WorkQueueContext = React.createContext<WorkQueueContextType | undefined>(undefined)

export const WorkQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [pendingCount, setPendingCount] = React.useState<number>(0)

  const refreshPendingCount = React.useCallback(async () => {
    if (!isAuthenticated) {
      setPendingCount(0)
      return
    }

    try {
      const res = await apiService.getPendingWorkItemCount()
      setPendingCount(res.count ?? 0)
    } catch {
      // Fail gracefully: hide badge on error
      setPendingCount(0)
    }
  }, [isAuthenticated])

  React.useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  return (
    <WorkQueueContext.Provider value={{ pendingCount, refreshPendingCount }}>
      {children}
    </WorkQueueContext.Provider>
  )
}

export const useWorkQueue = (): WorkQueueContextType => {
  const context = React.useContext(WorkQueueContext)
  if (!context) {
    // Provide safe fallback if consumed outside provider
    return {
      pendingCount: 0,
      refreshPendingCount: async () => {},
    }
  }
  return context
}
