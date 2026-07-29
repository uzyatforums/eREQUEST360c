import * as React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="h-7 bg-slate-900 text-slate-400 text-[11px] px-4 flex items-center justify-between border-t border-slate-800 z-30 select-none">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 font-medium">SQL Server Connected</span>
        </span>
        <span className="text-slate-600">|</span>
        <span>DB: <strong className="text-slate-300 font-mono">erequest360c</strong></span>
        <span className="text-slate-600">|</span>
        <span>API Engine v0.1.0</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded text-[10px] font-semibold">
          DEVELOPMENT
        </span>
        <span className="text-slate-600">|</span>
        <span>Session Countdown: <strong className="text-slate-300 font-mono">29:45</strong></span>
      </div>
    </footer>
  )
}
