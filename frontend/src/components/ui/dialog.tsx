import * as React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './button'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'warning' | 'primary'
  isLoading?: boolean
  remarksRequired?: boolean
  remarksValue?: string
  onRemarksChange?: (val: string) => void
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'destructive',
  isLoading,
  remarksRequired,
  remarksValue = '',
  onRemarksChange,
}) => {
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

  const isConfirmDisabled = isLoading || (remarksRequired && !remarksValue.trim())

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-md p-1"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed dark:text-slate-400">{description}</p>

            {remarksRequired && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  className="w-full text-xs rounded-md border border-slate-200 p-2 focus:ring-2 focus:ring-blue-600 focus:outline-none dark:bg-slate-950 dark:border-slate-800"
                  placeholder="Provide explicit operational remarks for this action..."
                  value={remarksValue}
                  onChange={(e) => onRemarksChange?.(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isConfirmDisabled}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
