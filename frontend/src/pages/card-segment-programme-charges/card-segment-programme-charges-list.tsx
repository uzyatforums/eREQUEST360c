import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Coins,
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Power,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { api } from '../../services/api'
import { CardSegmentProgrammeChargeListItem } from '../../types'
import { useWorkQueue } from '../../context/work-queue-context'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { useRowSelection } from '../../hooks/use-row-selection'
import { SortableHeader, SortOrder } from '../../components/ui/sortable-header'
import { Dialog } from '../../components/ui/dialog'

export const CardSegmentProgrammeChargesList: React.FC = () => {
  const navigate = useNavigate()
  const { refreshPendingCount } = useWorkQueue()

  const [items, setItems] = useState<CardSegmentProgrammeChargeListItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [toggleItem, setToggleItem] = useState<CardSegmentProgrammeChargeListItem | null>(null)
  const [isToggling, setIsToggling] = useState<boolean>(false)

  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [processingMode, setProcessingMode] = useState<string>('')
  const [segmentId, setSegmentId] = useState<string>('')
  const [cardProgrammeId, setCardProgrammeId] = useState<string>('')
  const [chargeHeaderId, setChargeHeaderId] = useState<string>('')

  // Sorting state (server-side)
  const [sortField, setSortField] = useState<string | null>('priority')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: string) => {
    setPage(1)
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

  const [segmentsLookup, setSegmentsLookup] = useState<Array<{ id: number; segment_code: string; segment_name: string }>>([])
  const [programmesLookup, setProgrammesLookup] = useState<Array<{ id: number; card_programme_code: string; card_programme_name: string }>>([])
  const [chargeHeadersLookup, setChargeHeadersLookup] = useState<Array<{ id: number; charge_name: string }>>([])

  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const pageSize = 25

  useEffect(() => {
    let mounted = true
    Promise.all([
      api.getCardSegments(),
      api.getCardProgrammes(),
      api.getChargeHeaderLookups(),
    ])
      .then(([segs, progs, headers]) => {
        if (mounted) {
          setSegmentsLookup(segs)
          setProgrammesLookup(progs)
          setChargeHeadersLookup(headers)
        }
      })
      .catch((err) => {
        console.error('Failed to load lookup options for filters:', err)
      })
    return () => {
      mounted = false
    }
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCardSegmentProgrammeCharges(
        search,
        statusFilter,
        undefined,
        chargeHeaderId ? Number(chargeHeaderId) : undefined,
        processingMode || undefined,
        page,
        pageSize,
        segmentId ? Number(segmentId) : undefined,
        cardProgrammeId ? Number(cardProgrammeId) : undefined,
        sortField || undefined,
        sortOrder || undefined
      )
      setItems(res.items)
      setTotal(res.total)
    } catch (err: any) {
      setError(err.message || 'Failed to load Card Segment Programme Charges.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, statusFilter, processingMode, segmentId, cardProgrammeId, chargeHeaderId, sortField, sortOrder, page])

  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<CardSegmentProgrammeChargeListItem>({
    items,
    getKey: (item) => item.id,
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
        await api.activateCardSegmentProgrammeCharge(Number(id))
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }
    clearSelection()
    loadData()
    refreshPendingCount()
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
        await api.deactivateCardSegmentProgrammeCharge(Number(id))
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }
    clearSelection()
    loadData()
    refreshPendingCount()
    alert(
      `Bulk Deactivate Completed: ${successCount} item(s) submitted for approval.${
        failureCount > 0 ? ` ${failureCount} item(s) failed or have pending changes.` : ''
      }`
    )
  }

  const handleConfirmToggle = async () => {
    if (!toggleItem) return
    setIsToggling(true)
    setError(null)
    setSuccessMsg(null)
    try {
      let res
      if (toggleItem.active) {
        res = await api.deactivateCardSegmentProgrammeCharge(toggleItem.id)
      } else {
        res = await api.activateCardSegmentProgrammeCharge(toggleItem.id)
      }

      if (res.status === 'PENDING_APPROVAL') {
        setSuccessMsg(`Action submitted for approval. Work Item: MC-${res.work_item_id.toString().padStart(8, '0')}`)
        refreshPendingCount()
      } else {
        setSuccessMsg(`Successfully ${toggleItem.active ? 'deactivated' : 'activated'} charge assignment.`)
      }
      loadData()
    } catch (err: any) {
      setError(err.message || 'Action failed.')
    } finally {
      setIsToggling(false)
      setToggleItem(null)
    }
  }

  const handleCopy = (id: number) => {
    navigate(`/card-segment-programme-charges/new?copyFrom=${id}`)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Card Segment Programme Charges Master
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage fee structures and Charge Header mappings assigned to Card Segment & Programme pairs.
          </p>
        </div>
        <button
          onClick={() => navigate('/card-segment-programme-charges/new')}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign New Charge
        </button>
      </div>

      {/* Alert Notifications */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by segment, programme, or charge header..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-white cursor-pointer"
            >
              <option value="active">Active Status</option>
              <option value="all">All Records</option>
              <option value="inactive">Inactive Status</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>

          <select
            value={processingMode}
            onChange={(e) => {
              setProcessingMode(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-white cursor-pointer"
          >
            <option value="">All Processing Modes</option>
            <option value="NORMAL">NORMAL</option>
            <option value="INSTANT">INSTANT</option>
            <option value="REPLACEMENT">REPLACEMENT</option>
            <option value="RENEWAL">RENEWAL</option>
            <option value="BULK">BULK</option>
          </select>

          {/* Card Segment Filter */}
          <select
            value={segmentId}
            onChange={(e) => {
              setSegmentId(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-white cursor-pointer max-w-[180px] truncate"
            title="Filter by Card Segment"
          >
            <option value="">All Card Segments</option>
            {segmentsLookup.map((s) => (
              <option key={s.id} value={s.id}>
                {s.segment_name} ({s.segment_code})
              </option>
            ))}
          </select>

          {/* Card Programme Filter */}
          <select
            value={cardProgrammeId}
            onChange={(e) => {
              setCardProgrammeId(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-white cursor-pointer max-w-[180px] truncate"
            title="Filter by Card Programme"
          >
            <option value="">All Card Programmes</option>
            {programmesLookup.map((p) => (
              <option key={p.id} value={p.id}>
                {p.card_programme_name} ({p.card_programme_code})
              </option>
            ))}
          </select>

          {/* Assigned Charge Header Filter */}
          <select
            value={chargeHeaderId}
            onChange={(e) => {
              setChargeHeaderId(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg dark:text-white cursor-pointer max-w-[180px] truncate"
            title="Filter by Assigned Charge Header"
          >
            <option value="">All Charge Headers</option>
            {chargeHeadersLookup.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.charge_name}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selection Status Bar */}
      <SelectionToolbar
        selectedCount={selectedCount}
        totalCount={total}
        onClearSelection={clearSelection}
        onBulkActivate={handleBulkActivate}
        onBulkDeactivate={handleBulkDeactivate}
      />

      {/* DataGrid Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-center w-12">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all charge assignments"
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Card Segment"
                    sortField="segment_code"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Card Programme"
                    sortField="card_programme_code"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Mode"
                    sortField="processing_mode_code"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Assigned Charge Header"
                    sortField="charge_name"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Priority"
                    sortField="priority"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3">
                  <SortableHeader
                    label="Status"
                    sortField="active"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading charge assignments...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Coins className="w-10 h-10 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium text-base">No Card Segment Programme Charges found</p>
                    <p className="text-xs mt-1">Try adjusting search filters or assign a new charge header.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const selected = isSelected(item.id)
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${selected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''}`}
                    >
                      <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleRow(item.id)}
                          aria-label={`Select assignment ${item.id}`}
                        />
                      </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.segment_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {item.segment_code}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.card_programme_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {item.card_programme_code} {item.card_brand ? `(${item.card_brand})` : ''}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {item.processing_mode_code}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.charge_name}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-gray-600 dark:text-gray-300">
                      {item.priority}
                    </td>

                    <td className="px-6 py-4">
                      {item.has_pending_change ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <span>Pending Approval</span>
                          {item.pending_work_item_id && (
                            <button
                              onClick={() => navigate(`/maker-checker?workItemId=${item.pending_work_item_id}`)}
                              className="font-mono underline hover:text-amber-900 dark:hover:text-amber-100 inline-flex items-center gap-0.5"
                              title="Review pending Maker/Checker work item"
                            >
                              <span>({item.pending_work_item_id})</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : item.active ? (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/card-segment-programme-charges/${item.id}`)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/card-segment-programme-charges/${item.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Edit Mapping"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopy(item.id)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Copy Pre-populated"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setToggleItem(item)}
                          className={`p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer ${
                            item.active ? 'text-gray-500 hover:text-amber-600' : 'text-gray-500 hover:text-emerald-600'
                          }`}
                          title={item.active ? 'Deactivate Mapping' : 'Activate Mapping'}
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-800/40 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
          <div>
            Showing <span className="font-medium text-gray-900 dark:text-white">{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-medium text-gray-900 dark:text-white">{total}</span> assignments
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} of {Math.ceil(total / pageSize) || 1}</span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 border border-gray-300 dark:border-gray-700 rounded-md disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog
        isOpen={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={handleConfirmToggle}
        title={toggleItem?.active ? 'Deactivate Charge Assignment?' : 'Activate Charge Assignment?'}
        description={`Are you sure you want to ${toggleItem?.active ? 'deactivate' : 'activate'} charge assignment #${toggleItem?.id} (${toggleItem?.segment_code} \u2192 ${toggleItem?.card_programme_code})? ${
          toggleItem?.active
            ? 'Deactivating this mapping will prevent fee calculation for this segment and programme pair.'
            : 'Activating this mapping will make it immediately active for fee calculation.'
        }`}
        confirmText={toggleItem?.active ? 'Deactivate Assignment' : 'Activate Assignment'}
        variant={toggleItem?.active ? 'destructive' : 'primary'}
        isLoading={isToggling}
      />
    </div>
  )
}
