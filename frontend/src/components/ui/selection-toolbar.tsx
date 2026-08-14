import * as React from 'react'
import { Button } from './button'
import { Tooltip } from './tooltip'
import { X, CheckCircle2, Power, XCircle } from 'lucide-react'

export interface SelectionToolbarProps {
  selectedCount: number
  totalCount?: number
  onClearSelection: () => void
  onBulkActivate?: () => void
  onBulkDeactivate?: () => void
  onBulkApprove?: () => void
  onBulkReject?: () => void
  bulkActionsDisabledTooltip?: string
  customActions?: React.ReactNode
  className?: string
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  onBulkActivate,
  onBulkDeactivate,
  onBulkApprove,
  onBulkReject,
  bulkActionsDisabledTooltip = 'Select one or more rows to perform bulk actions.',
  customActions,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border transition-all duration-200 ${
        selectedCount > 0
          ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 shadow-2xs'
          : 'bg-slate-50/50 border-slate-200 dark:bg-slate-900/30 dark:border-slate-800'
      } ${className}`}
    >
      {/* Left: Selection Count & Active Status */}
      <div className="flex items-center space-x-2.5">
        <span
          className={`inline-flex items-center justify-center font-semibold text-xs px-2.5 py-0.5 rounded-full transition-colors ${
            selectedCount > 0
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {selectedCount}
        </span>
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {selectedCount > 0
            ? `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`
            : 'No items selected'}
          {totalCount !== undefined && totalCount > 0 && selectedCount === 0 && (
            <span className="text-slate-400 font-normal ml-1">({totalCount} total)</span>
          )}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        {selectedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 cursor-pointer h-8 px-2.5"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear Selection
          </Button>
        )}

        {customActions}

        {onBulkApprove && (
          <Tooltip content={selectedCount > 0 ? `Approve ${selectedCount} selected work item${selectedCount === 1 ? '' : 's'}` : bulkActionsDisabledTooltip} position="top">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkApprove}
              className={`text-xs font-semibold h-8 px-3 transition-colors ${
                selectedCount > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-none cursor-pointer shadow-xs'
                  : 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Bulk Approve
            </Button>
          </Tooltip>
        )}

        {onBulkReject && (
          <Tooltip content={selectedCount > 0 ? `Reject ${selectedCount} selected work item${selectedCount === 1 ? '' : 's'}` : bulkActionsDisabledTooltip} position="top">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkReject}
              className={`text-xs font-semibold h-8 px-3 transition-colors ${
                selectedCount > 0
                  ? 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700 border-none cursor-pointer shadow-xs'
                  : 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Bulk Reject
            </Button>
          </Tooltip>
        )}

        {onBulkActivate && (
          <Tooltip content={selectedCount > 0 ? `Activate ${selectedCount} selected record${selectedCount === 1 ? '' : 's'}` : bulkActionsDisabledTooltip} position="top">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkActivate}
              className={`text-xs font-semibold h-8 px-3 transition-colors ${
                selectedCount > 0
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 border-none cursor-pointer shadow-xs'
                  : 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Bulk Activate
            </Button>
          </Tooltip>
        )}

        {onBulkDeactivate && (
          <Tooltip content={selectedCount > 0 ? `Deactivate ${selectedCount} selected record${selectedCount === 1 ? '' : 's'}` : bulkActionsDisabledTooltip} position="top">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onBulkDeactivate}
              className={`text-xs font-semibold h-8 px-3 transition-colors ${
                selectedCount > 0
                  ? 'bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 border-none cursor-pointer shadow-xs'
                  : 'opacity-60 cursor-not-allowed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
              }`}
            >
              <Power className="h-3.5 w-3.5 mr-1.5" />
              Bulk Deactivate
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
