import * as React from 'react'
import {
  User,
  Shield,
  Clock,
  LogOut,
  X,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { UserInfo, IAMRole } from '../../types'
import { apiService } from '../../services/api'
import { Button } from '../ui/button'
import { useToast } from '../ui/toast'
import { cn } from '../../lib/utils'

interface UserProfileMenuProps {
  user: UserInfo
  isOpen: boolean
  onClose: () => void
  onSignOut?: () => void
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  isOpen,
  onClose,
  onSignOut,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = React.useState<'profile' | 'roles' | 'session'>('profile')
  const [iamRoles, setIamRoles] = React.useState<IAMRole[]>([])

  // Fetch IAM Roles on open
  React.useEffect(() => {
    if (isOpen) {
      apiService.getIAMRoles().then(setIamRoles).catch(() => {})
    }
  }, [isOpen])

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // User's assigned IAM Role objects
  const assignedIamRoles = iamRoles.filter((r) => user.roles.includes(r.role_code))

  const handleLogout = () => {
    onClose()
    if (onSignOut) {
      onSignOut()
    } else {
      toast({
        title: 'Signed Out Successfully',
        description: 'Your user session has been terminated.',
        variant: 'info',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-end p-4 sm:p-6 pt-16 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Profile Menu Popover Modal */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        {/* Top User Header Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-blue-600 border-2 border-white/20 flex items-center justify-center font-bold text-base shadow-sm">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">{user.username}</h3>
              <p className="text-[11px] text-blue-200 font-mono">User ID: {user.user_id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-2 text-xs dark:bg-slate-950 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 font-semibold dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <User className="h-3.5 w-3.5" />
            Profile
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'roles'
                ? 'border-blue-600 text-blue-600 font-semibold dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            My Roles ({user.roles.length})
          </button>

          <button
            onClick={() => setActiveTab('session')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'session'
                ? 'border-blue-600 text-blue-600 font-semibold dark:border-blue-500 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Session
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-3">
          {activeTab === 'profile' && (
            <div className="space-y-3 text-xs animate-in fade-in-50">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 dark:bg-slate-950 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Username:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{user.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">User ID:</span>
                  <span className="font-mono font-medium text-slate-700">{user.user_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Client Tenant ID:</span>
                  <span className="font-medium text-slate-800">{user.client_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Branch Code:</span>
                  <span className="font-mono text-slate-800">{user.branch_code || '001'}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-blue-900 text-[11px] space-y-1">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> Active Role Assignment
                </span>
                <p>
                  Account authenticated via JWT with {user.roles.length} active assigned system roles from <code className="font-mono text-blue-700">/auth/me</code>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-2 text-xs animate-in fade-in-50">
              <p className="text-[11px] text-slate-500">
                Roles assigned to your account from SQL Server database:
              </p>

              {user.roles.map((roleCode) => {
                const roleObj = assignedIamRoles.find((r) => r.role_code === roleCode)
                return (
                  <div
                    key={roleCode}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 dark:bg-slate-950 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {roleObj?.role_name || roleCode}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                        {roleCode}
                      </span>
                    </div>

                    {roleObj?.description && (
                      <p className="text-[11px] text-slate-500">{roleObj.description}</p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {roleObj?.is_maker && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          Maker
                        </span>
                      )}
                      {roleObj?.is_checker && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                          Checker
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'session' && (
            <div className="space-y-2 text-xs animate-in fade-in-50">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 dark:bg-slate-950 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Storage Location:</span>
                  <span className="font-mono font-medium text-slate-800">sessionStorage Only</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Session Status:</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Active & Valid
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">JWT Bearer Auth:</span>
                  <span className="font-mono text-slate-700">Enforced for /config/*</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions / Sign Out Button */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
          <span className="text-[11px] text-slate-400 font-mono">eREQUEST360 v0.1.0</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            leftIcon={<LogOut className="h-3.5 w-3.5" />}
            className="h-8 text-xs cursor-pointer"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}
