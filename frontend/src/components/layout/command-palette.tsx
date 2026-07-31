import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CreditCard, Users, Settings, X, ChevronRight } from 'lucide-react'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (route: string) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const navigate = useNavigate()
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // toggle
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const items = [
    { title: 'Card Programmes', subtitle: 'Configuration / Card Programmes', route: '/card-programmes', icon: Settings },
    { title: 'New Card Request', subtitle: 'Submit new card request', route: '/requests/new', icon: CreditCard },
    { title: 'Pending Authorization', subtitle: 'Branch approval queue', route: '/maker-checker', icon: CreditCard },
    { title: 'User Management', subtitle: 'IAM / User Directory', route: '/iam/users', icon: Users },
  ]

  const filtered = items.filter(
    (i) => i.title.toLowerCase().includes(query.toLowerCase()) || i.subtitle.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative mx-auto max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            type="text"
            className="h-12 w-full bg-transparent border-0 px-3 text-sm focus:outline-none placeholder:text-slate-400 dark:text-slate-100"
            placeholder="Type a command or search programmes, requests, users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-2 max-h-96 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Actions & Screens
          </div>
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No matching commands or screens found.</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.route}
                  onClick={() => {
                    if (onNavigate) onNavigate(item.route)
                    navigate(item.route)
                    onClose()
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-600 dark:bg-slate-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500">{item.subtitle}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

