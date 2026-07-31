import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
  required?: boolean
  leftIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, required, leftIcon, id, maxLength, value, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId)
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={inputId} className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
          )}
          {maxLength && (
            <span className="text-[10px] font-mono text-slate-400">
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <div className="relative flex items-center">
          {leftIcon && <div className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</div>}
          <input
            id={inputId}
            type={type}
            maxLength={maxLength}
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-500',
              leftIcon && 'pl-9',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>

        {error ? (
          <p id={errorId} className="text-xs text-red-600 font-medium animate-in fade-in-50">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-[11px] text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
