import * as React from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface DropdownMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

interface DropdownMenuProps {
  items: DropdownMenuItem[]
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ items }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 dark:hover:bg-slate-800 dark:text-slate-400"
        aria-label="Row Actions"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-md bg-white shadow-lg border border-slate-200 py-1 z-40 animate-in fade-in-50 zoom-in-95 dark:bg-slate-900 dark:border-slate-800">
          {items.map((item, idx) => (
            <button
              key={idx}
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false)
                item.onClick()
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
                item.variant === 'destructive'
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              )}
            >
              {item.icon && <span className="h-3.5 w-3.5 shrink-0 text-slate-400">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
