import * as React from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Search, RotateCw, Download, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'

interface FilterOption {
  columnId: string
  title: string
  options: { label: string; value: string }[]
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  filterOptions?: FilterOption[]
  onRefresh?: () => void
  onExport?: () => void
  isLoading?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Search records...',
  filterOptions,
  onRefresh,
  onExport,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [searchInput, setSearchInput] = React.useState('')
  const [globalFilter, setGlobalFilter] = React.useState('')

  // 300ms Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalFilter(searchInput)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchInput])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-3">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
        {/* Search & Filters Left */}
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="w-full sm:w-64">
            <Input
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="h-3.5 w-3.5" />}
              className="h-8 text-xs"
            />
          </div>

          {filterOptions?.map((filter) => (
            <div key={filter.columnId} className="w-36">
              <Select
                value={(table.getColumn(filter.columnId)?.getFilterValue() as string) ?? 'ALL'}
                onChange={(e) => {
                  const val = e.target.value
                  table.getColumn(filter.columnId)?.setFilterValue(val === 'ALL' ? undefined : val)
                }}
                options={[{ label: `All ${filter.title}`, value: 'ALL' }, ...filter.options]}
                className="h-8 text-xs py-0"
              />
            </div>
          ))}
        </div>

        {/* Toolbar Utility Buttons */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              isLoading={isLoading}
              leftIcon={<RotateCw className="h-3.5 w-3.5" />}
              className="h-8 text-xs"
            >
              Refresh
            </Button>
          )}

          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              className="h-8 text-xs"
            >
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs dark:bg-slate-900 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2.5 whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {columns.map((_, cIdx) => (
                      <td key={cIdx} className="px-4 py-3">
                        <div className="h-4 bg-slate-200 rounded-sm dark:bg-slate-800 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                // Empty State View
                <tr>
                  <td colSpan={columns.length} className="h-48 text-center px-4">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <Inbox className="h-8 w-8 stroke-1" />
                      <p className="text-xs font-medium text-slate-500">No matching records found.</p>
                      <p className="text-[11px] text-slate-400">Try adjusting your search terms or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            records
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                {[10, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
