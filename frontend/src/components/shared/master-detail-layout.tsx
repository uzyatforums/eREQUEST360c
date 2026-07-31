import * as React from 'react'
import { Search, RotateCw, Plus, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { cn } from '../../lib/utils'

export interface MasterDetailTab {
  id: string
  label: string
  badge?: string | number
  icon?: React.ReactNode
  content: React.ReactNode
}

export interface FilterOption {
  id: string
  title: string
  value: string
  onChange: (val: string) => void
  options: { label: string; value: string }[]
}

interface MasterDetailLayoutProps<T> {
  // Master list props
  items: T[]
  selectedItem: T | null
  getItemId: (item: T) => string | number
  onSelectItem: (item: T) => void
  onDoubleSelectItem?: (item: T) => void
  renderMasterItem: (item: T, isSelected: boolean) => React.ReactNode
  
  // Search & Toolbar props
  masterSearchValue: string
  onMasterSearchChange: (val: string) => void
  masterSearchPlaceholder?: string
  filterOptions?: FilterOption[]
  onMasterRefresh?: () => void
  onMasterCreate?: () => void
  createButtonText?: string
  isLoading?: boolean
  
  // Detail workspace props
  detailHeaderTitle?: string
  detailHeaderSubtitle?: string
  detailHeaderBadge?: React.ReactNode
  detailActions?: React.ReactNode
  tabs: MasterDetailTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
}

export function MasterDetailLayout<T>({
  items,
  selectedItem,
  getItemId,
  onSelectItem,
  onDoubleSelectItem,
  renderMasterItem,
  masterSearchValue,
  onMasterSearchChange,
  masterSearchPlaceholder = 'Search records...',
  filterOptions,
  onMasterRefresh,
  onMasterCreate,
  createButtonText = 'New',
  isLoading,
  detailHeaderTitle,
  detailHeaderSubtitle,
  detailHeaderBadge,
  detailActions,
  tabs,
  activeTabId,
  onTabChange,
}: MasterDetailLayoutProps<T>) {
  // Resizable sidebar state (Default 360px, Min 320px, Max 420px)
  const [sidebarWidth, setSidebarWidth] = React.useState(360)
  const [isResizing, setIsResizing] = React.useState(false)

  // Pagination state for left pane
  const [pageSize, setPageSize] = React.useState(10)
  const [currentPage, setCurrentPage] = React.useState(1)

  // Drag handler for resizable pane
  const startResizing = React.useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = React.useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX - 240 // subtract app sidebar offset
        if (newWidth >= 320 && newWidth <= 420) {
          setSidebarWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  React.useEffect(() => {
    window.addEventListener('mousemove', resize)
    window.addEventListener('mouseup', stopResizing)
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [resize, stopResizing])

  // Pagination logic
  const totalPages = Math.ceil(items.length / pageSize) || 1
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const selectedId = selectedItem ? getItemId(selectedItem) : null

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8.5rem)] select-none">
      {/* LEFT PANE (Master Selector) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className="w-full shrink-0 flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden dark:bg-slate-900 dark:border-slate-800"
      >
        {/* Left Toolbar Header */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder={masterSearchPlaceholder}
                value={masterSearchValue}
                onChange={(e) => onMasterSearchChange(e.target.value)}
                leftIcon={<Search className="h-3.5 w-3.5" />}
                className="h-8 text-xs"
              />
            </div>
            {onMasterCreate && (
              <Button
                variant="primary"
                size="sm"
                onClick={onMasterCreate}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                className="h-8 text-xs shrink-0"
              >
                {createButtonText}
              </Button>
            )}
          </div>

          {/* Filter Bar & Utility Refresh */}
          <div className="flex items-center gap-1.5">
            {filterOptions?.map((filter) => (
              <div key={filter.id} className="flex-1">
                <Select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  options={[{ label: `All ${filter.title}`, value: 'ALL' }, ...filter.options]}
                  className="h-7 text-[11px] py-0 px-2"
                />
              </div>
            ))}
            {onMasterRefresh && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onMasterRefresh}
                isLoading={isLoading}
                leftIcon={<RotateCw className="h-3 w-3" />}
                className="h-7 px-2 text-[11px]"
              >
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* Master List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="p-3 space-y-2 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-2/3 dark:bg-slate-800" />
                <div className="h-3 bg-slate-100 rounded w-1/2 dark:bg-slate-800" />
              </div>
            ))
          ) : paginatedItems.length > 0 ? (
            paginatedItems.map((item) => {
              const itemId = getItemId(item)
              const isSelected = itemId === selectedId
              return (
                <div
                  key={itemId}
                  tabIndex={0}
                  onClick={() => onSelectItem(item)}
                  onDoubleClick={() => onDoubleSelectItem?.(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onDoubleSelectItem?.(item)
                    }
                  }}
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-600',
                    isSelected &&
                      'bg-blue-50/70 border-l-4 border-l-blue-600 dark:bg-blue-950/40 dark:border-l-blue-500'
                  )}
                >
                  {renderMasterItem(item, isSelected)}
                </div>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Inbox className="h-7 w-7 mx-auto stroke-1" />
              <p className="text-xs font-medium text-slate-500">No records found</p>
            </div>
          )}
        </div>

        {/* Left Pane Footer Pagination */}
        <div className="p-2 bg-slate-50 border-t border-slate-200 text-[11px] flex items-center justify-between text-slate-500 dark:bg-slate-950 dark:border-slate-800">
          <span>
            {items.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, items.length)} of {items.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="h-6 w-6 p-0 text-[10px]"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="px-1 font-medium">{currentPage}/{totalPages}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="h-6 w-6 p-0 text-[10px]"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Resize Drag Handle */}
      <div
        onMouseDown={startResizing}
        className="hidden lg:block w-1 hover:w-1.5 bg-transparent hover:bg-blue-500 cursor-col-resize transition-all shrink-0 rounded"
      />

      {/* RIGHT PANE (Detail Workspace) */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden dark:bg-slate-900 dark:border-slate-800">
        {selectedItem ? (
          <>
            {/* Detail Header & Action Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 dark:bg-slate-950 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {detailHeaderTitle}
                  </h2>
                  {detailHeaderBadge}
                </div>
                {detailHeaderSubtitle && (
                  <p className="text-xs font-mono text-slate-500">{detailHeaderSubtitle}</p>
                )}
              </div>

              {detailActions && <div className="flex items-center gap-2">{detailActions}</div>}
            </div>

            {/* Sub-Tab Navigation Bar */}
            <div className="border-b border-slate-200 bg-white px-4 flex items-center gap-1 overflow-x-auto dark:bg-slate-900 dark:border-slate-800">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'border-blue-600 text-blue-600 font-semibold dark:border-blue-500 dark:text-blue-400'
                        : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400'
                    )}
                  >
                    {tab.icon && <span className="h-3.5 w-3.5">{tab.icon}</span>}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && (
                      <span className="bg-slate-100 text-slate-700 rounded-full px-1.5 py-0.2 text-[10px] font-semibold dark:bg-slate-800 dark:text-slate-300">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Active Tab Content Area */}
            <div className="flex-1 p-5 overflow-y-auto">
              {tabs.find((t) => t.id === activeTabId)?.content}
            </div>
          </>
        ) : (
          /* Empty Selection View */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <Inbox className="h-10 w-10 stroke-1 text-slate-300" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No Record Selected
              </h3>
              <p className="text-xs text-slate-500">
                Select a record from the left list to view detailed parameters, segments, charges & audit logs.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
