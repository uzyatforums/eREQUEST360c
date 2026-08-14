import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Coins,
  Search,
  Plus,
  Eye,
  Edit2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Layers,
  Filter,
  Power,
} from 'lucide-react'
import { api } from '../../services/api'
import { CardChargesHeader } from '../../types'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { useRowSelection } from '../../hooks/use-row-selection'
import { SortableHeader, SortOrder } from '../../components/ui/sortable-header'
import { Dialog } from '../../components/ui/dialog'
import { useWorkQueue } from '../../context/work-queue-context'

export const CardChargesList: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { refreshPendingCount } = useWorkQueue()

  const [headers, setHeaders] = React.useState<CardChargesHeader[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  const [toggleItem, setToggleItem] = React.useState<CardChargesHeader | null>(null)
  const [isToggling, setIsToggling] = React.useState(false)

  const [searchTerm, setSearchTerm] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('ACTIVE')

  // Sorting state
  const [sortField, setSortField] = React.useState<string | null>('id')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const fetchCharges = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getCardCharges(searchTerm, statusFilter)
      setHeaders(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load card charges.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter])

  React.useEffect(() => {
    fetchCharges()
  }, [fetchCharges])

  const handleConfirmToggle = async () => {
    if (!toggleItem) return
    setIsToggling(true)
    setError(null)
    setSuccessMsg(null)
    try {
      let res
      if (toggleItem.active) {
        res = await api.deactivateCardCharge(toggleItem.id)
      } else {
        res = await api.activateCardCharge(toggleItem.id)
      }

      if (res?.status === 'PENDING_APPROVAL') {
        setSuccessMsg(`Action submitted for approval. Work Item: MC-${res.work_item_id.toString().padStart(8, '0')}`)
        refreshPendingCount()
      } else {
        setSuccessMsg(`Successfully ${toggleItem.active ? 'deactivated' : 'activated'} charge profile.`)
      }
      fetchCharges()
    } catch (err: any) {
      setError(err?.message || 'Action failed.')
    } finally {
      setIsToggling(false)
      setToggleItem(null)
    }
  }

  const filteredSortedHeaders = React.useMemo(() => {
    if (!sortField || !sortOrder) return headers

    return [...headers].sort((a: any, b: any) => {
      let valA = a[sortField]
      let valB = b[sortField]

      if (sortField === 'entries_count') {
        valA = a.entries_count || a.entries?.length || 0
        valB = b.entries_count || b.entries?.length || 0
      } else if (sortField === 'effective_currency') {
        valA = a.effective_currency || 'NGN'
        valB = b.effective_currency || 'NGN'
      }

      valA = valA ?? ''
      valB = valB ?? ''

      let comp = 0
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB
      } else {
        comp = String(valA).localeCompare(String(valB))
      }

      return sortOrder === 'asc' ? comp : -comp
    })
  }, [headers, sortField, sortOrder])

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<CardChargesHeader>({
    items: filteredSortedHeaders,
    getKey: (h) => h.id,
  })

  const handleBulkActivate = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    if (
      !window.confirm(
        `Are you sure you want to Activate ${ids.length} selected record(s)? This will submit ${ids.length} request(s) for Maker/Checker approval.`
      )
    ) {
      return
    }
    let successCount = 0
    let failureCount = 0
    for (const id of ids) {
      try {
        await api.activateCardCharge(Number(id))
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }
    clearSelection()
    fetchCharges()
    alert(
      `Bulk Activate Completed: ${successCount} item(s) submitted for approval.${
        failureCount > 0 ? ` ${failureCount} item(s) failed or have pending changes.` : ''
      }`
    )
  }

  const handleBulkDeactivate = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    if (
      !window.confirm(
        `Are you sure you want to Deactivate ${ids.length} selected record(s)? This will submit ${ids.length} request(s) for Maker/Checker approval.`
      )
    ) {
      return
    }
    let successCount = 0
    let failureCount = 0
    for (const id of ids) {
      try {
        await api.deactivateCardCharge(Number(id))
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }
    clearSelection()
    fetchCharges()
    alert(
      `Bulk Deactivate Completed: ${successCount} item(s) submitted for approval.${
        failureCount > 0 ? ` ${failureCount} item(s) failed or have pending changes.` : ''
      }`
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Card Charges Master
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure financial posting rulesets, fee accounting templates, and debit/credit entry specifications.
          </p>
        </div>

        <button
          onClick={() => navigate('/card-charges/new')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Charge Profile
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by profile name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          >
            <option value="ACTIVE">Active Only</option>
            <option value="ALL">All Statuses</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Error & Success Notifications */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:underline text-xs cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Selection Status Bar */}
      <SelectionToolbar
        selectedCount={selectedCount}
        totalCount={headers.length}
        onClearSelection={clearSelection}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
      />

      {/* Data Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all charges"
                  />
                </th>
                <th className="py-3.5 px-4">
                  <SortableHeader
                    label="ID"
                    sortField="id"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3.5 px-4">
                  <SortableHeader
                    label="Charge Name"
                    sortField="charge_name"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3.5 px-4">
                  <SortableHeader
                    label="Description"
                    sortField="description"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3.5 px-4 text-center">
                  <SortableHeader
                    label="Entries"
                    sortField="entries_count"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-3.5 px-4">
                  <SortableHeader
                    label="Currency"
                    sortField="effective_currency"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3.5 px-4">
                  <SortableHeader
                    label="Status"
                    sortField="active"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading card charges profiles...
                  </td>
                </tr>
              ) : filteredSortedHeaders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No card charge profiles found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredSortedHeaders.map((item) => {
                  const selected = isSelected(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors ${selected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleRow(item.id)}
                          aria-label={`Select charge ${item.charge_name}`}
                        />
                      </td>
                    {/* Primary Key ID */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      #{item.id}
                    </td>

                    {/* Header Name & Pending Badge */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{item.charge_name}</span>
                        {item.has_pending_change && item.pending_work_item_id && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 w-fit">
                            <ShieldAlert className="w-3 h-3 text-amber-500" />
                            <span>Pending:</span>
                            <button
                              onClick={() => navigate(`/maker-checker?focus=${item.pending_work_item_id}`)}
                              className="font-mono underline hover:text-amber-900 dark:hover:text-amber-100 inline-flex items-center gap-0.5"
                              title="Navigate to Approval Queue to Review Request"
                            >
                              MC-{String(item.pending_work_item_id).padStart(8, '0')}
                              <ExternalLink className="w-2.5 h-2.5 inline" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {item.description || '—'}
                    </td>

                    {/* Entries Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {item.entries_count || item.entries?.length || 0} Lines
                      </span>
                    </td>

                    {/* Currency */}
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {item.effective_currency || 'NGN'}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {item.active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Action */}
                        <button
                          onClick={() => navigate(`/card-charges/${item.id}`)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Action */}
                        <button
                          onClick={() => navigate(`/card-charges/${item.id}/edit`)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Charge Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Copy Action */}
                        <button
                          onClick={() => navigate(`/card-charges/new?copyFrom=${item.id}`)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Copy Charge Profile"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Activate / Deactivate Action */}
                        <button
                          onClick={() => setToggleItem(item)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.active
                              ? 'text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                          title={item.active ? 'Deactivate Charge Profile' : 'Activate Charge Profile'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog
        isOpen={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={handleConfirmToggle}
        title={toggleItem?.active ? 'Deactivate Charge Profile?' : 'Activate Charge Profile?'}
        description={`Are you sure you want to ${toggleItem?.active ? 'deactivate' : 'activate'} '${toggleItem?.charge_name}'? ${
          toggleItem?.active
            ? 'Deactivating this charge profile will prevent it from being assigned to new card segments.'
            : 'Activating this charge profile will make it available for segment assignment.'
        }`}
        confirmText={toggleItem?.active ? 'Deactivate Profile' : 'Activate Profile'}
        variant={toggleItem?.active ? 'destructive' : 'primary'}
        isLoading={isToggling}
      />
    </div>
  )
}
