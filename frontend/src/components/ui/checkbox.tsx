import * as React from 'react'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean
  label?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', indeterminate, label, id, checked, onChange, disabled, ...props }, ref) => {
    const defaultRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || defaultRef

    React.useEffect(() => {
      if (combinedRef.current) {
        combinedRef.current.indeterminate = !!indeterminate
      }
    }, [combinedRef, indeterminate])

    const generatedId = React.useId()
    const inputId = id || generatedId

    return (
      <div className="inline-flex items-center space-x-2">
        <input
          type="checkbox"
          id={inputId}
          ref={combinedRef}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
