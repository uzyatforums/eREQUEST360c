import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CreditCard,
  ShieldCheck,
  Settings,
  Users,
  KeyRound,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  Layers,
  Coins,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useWorkQueue } from '../../context/work-queue-context'

interface SidebarProps {
  activeRoute?: string
  onNavigate?: (route: string) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ activeRoute, onNavigate }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { pendingCount } = useWorkQueue()
  const [configOpen, setConfigOpen] = React.useState(true)

  const currentPath = location.pathname || activeRoute || '/card-programmes'

  const handleNav = (route: string) => {
    if (onNavigate) {
      onNavigate(route)
    }
    navigate(route)
  }

  const isRouteActive = (route: string) => {
    if (route === '/card-programmes' || route === '/card-segments' || route === '/maker-checker') {
      return currentPath.startsWith(route)
    }
    return currentPath === route
  }

  const navItems = [
    { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
    { label: 'Card Requests', route: '/requests', icon: CreditCard },
    {
      label: 'Maker-Checker Queue',
      route: '/maker-checker',
      icon: ShieldCheck,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
  ]

  const configItems = [
    { label: 'Card Programmes', route: '/card-programmes', icon: Layers },
    { label: 'Card Segments', route: '/card-segments', icon: Settings },
    { label: 'Card Charges', route: '/config/charges', icon: Coins },
    { label: 'Branch Directory', route: '/config/branches', icon: Building2 },
  ]

  const adminItems = [
    { label: 'User Accounts', route: '/iam/users', icon: Users },
    { label: 'Roles & Permissions', route: '/iam/roles', icon: KeyRound },
    { label: 'Audit & Reports', route: '/reports', icon: FileSpreadsheet },
  ]

  return (
    <aside className="w-60 border-r border-slate-200 bg-slate-50/50 min-h-[calc(100vh-3.5rem)] p-3 flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800">
      <div className="space-y-4">
        {/* Core Operations Group */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Core Operations
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = isRouteActive(item.route)
              return (
                <button
                  key={item.route}
                  onClick={() => handleNav(item.route)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800',
                    isActive && 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-400'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-amber-200">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Configuration Group */}
        <div>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="w-full px-3 mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-slate-400 uppercase hover:text-slate-600"
          >
            <span>Configuration</span>
            <ChevronRight className={cn('h-3 w-3 transition-transform', configOpen && 'rotate-90')} />
          </button>
          {configOpen && (
            <nav className="space-y-1 pl-1">
              {configItems.map((item) => {
                const Icon = item.icon
                const isActive = isRouteActive(item.route)
                return (
                  <button
                    key={item.route}
                    onClick={() => handleNav(item.route)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800',
                      isActive && 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-400'
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          )}
        </div>

        {/* System Administration Group */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Administration & Audit
          </div>
          <nav className="space-y-1">
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = isRouteActive(item.route)
              return (
                <button
                  key={item.route}
                  onClick={() => handleNav(item.route)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors text-slate-700 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-slate-800',
                    isActive && 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/50 dark:text-blue-400'
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-slate-500')} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-200 text-[10px] text-slate-400 dark:border-slate-800">
        <div>eREQUEST360 Platform</div>
        <div>Version 1.0.0 (Design System v1.1)</div>
      </div>
    </aside>
  )
}

