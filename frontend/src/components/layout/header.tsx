import * as React from 'react'
import { UserInfo } from '../../types'
import { Bell, Search, Shield, ChevronDown, User } from 'lucide-react'

interface HeaderProps {
  user: UserInfo
  onOpenCommandPalette: () => void
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenCommandPalette }) => {
  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30 dark:bg-slate-900 dark:border-slate-800">
      {/* Brand & Context Identifiers */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
            e360
          </div>
          <span className="font-bold text-base text-slate-900 dark:text-slate-100 tracking-tight">
            eREQUEST<span className="text-blue-600">360</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Tenant Context Selector */}
        <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-semibold">Tenant:</span>
          <span>Apex MFB (100)</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </div>

        {/* Branch Context Indicator */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Branch:</span>
          <span>Main Branch ({user.branch_code || '001'})</span>
        </div>
      </div>

      {/* Center Search Trigger */}
      <div className="flex-1 max-w-md mx-4 hidden lg:block">
        <button
          onClick={onOpenCommandPalette}
          className="w-full h-8 bg-slate-100 border border-slate-200 rounded-md px-3 flex items-center justify-between text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-50 transition-colors dark:bg-slate-950 dark:border-slate-800"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span>Search requests, accounts, or jump to screen...</span>
          </div>
          <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right User & Controls */}
      <div className="flex items-center gap-3">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommandPalette}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none">
              {user.username}
            </div>
            <div className="text-[10px] text-slate-500 capitalize leading-tight mt-0.5">
              {user.roles[0]?.replace('_', ' ') || 'User'}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
