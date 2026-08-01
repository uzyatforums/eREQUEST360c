import * as React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

export type SortOrder = 'asc' | 'desc' | null

export interface SortableHeaderProps {
  label: string
  sortField: string
  currentSortField: string | null
  currentSortOrder: SortOrder
  onSort: (field: string) => void
  align?: 'left' | 'center' | 'right'
  className?: string
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortField,
  currentSortField,
  currentSortOrder,
  onSort,
  align = 'left',
  className = '',
}) => {
  const isSorted = currentSortField === sortField

  const alignmentClasses = {
    left: 'justify-start text-left',
    center: 'justify-center text-center',
    right: 'justify-end text-right',
  }

  return (
    <button
      type="button"
      onClick={() => onSort(sortField)}
      className={`group flex items-center space-x-1 font-semibold text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer select-none ${alignmentClasses[align]} ${className}`}
    >
      <span>{label}</span>
      <span className="shrink-0">
        {isSorted ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 font-bold" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 font-bold" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    </button>
  )
}
