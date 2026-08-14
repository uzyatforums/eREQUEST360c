import * as React from 'react'
import {
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Clock,
  User,
  AlertTriangle,
  FileCode,
  ListFilter,
  Sparkles,
} from 'lucide-react'
import {
  WorkItemRead,
  WorkItemPayloadRead,
  WorkItemActionRead,
  UserInfo,
} from '../types'
import { apiService } from '../services/api'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { StatusBadge } from '../components/ui/status-badge'
import { Button } from '../components/ui/button'
import { Tooltip } from '../components/ui/tooltip'
import { Sheet } from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../components/ui/toast'
import { SortableHeader, SortOrder } from '../components/ui/sortable-header'
import { formatDate, cn } from '../lib/utils'
import { useWorkQueue } from '../context/work-queue-context'
import { Checkbox } from '../components/ui/checkbox'
import { SelectionToolbar } from '../components/ui/selection-toolbar'
import { useRowSelection } from '../hooks/use-row-selection'

export interface MakerCheckerPageProps {
  currentUser: UserInfo
}

interface ParsedDiffItem {
  fieldKey: string
  label: string
  beforeVal: any
  afterVal: any
  isChanged: boolean
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED'
}

export const MakerCheckerPage: React.FC<MakerCheckerPageProps> = ({
  currentUser,
}) => {
  const { toast } = useToast()
  const { refreshPendingCount } = useWorkQueue()

  // Master State
  const [workItems, setWorkItems] = React.useState<WorkItemRead[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState('')
  const [entityTypeFilter, setEntityTypeFilter] = React.useState<string>('ALL')
  const [operationFilter, setOperationFilter] = React.useState<string>('ALL')

  // Sorting
  const [sortField, setSortField] = React.useState<string | null>('created_date')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc')

  // Drawer Inspection State (SCR-MC-002 / SCR-MC-003)
  const [selectedWorkItem, setSelectedWorkItem] = React.useState<WorkItemRead | null>(null)
  const [payloadData, setPayloadData] = React.useState<WorkItemPayloadRead | null>(null)
  const [actionHistory, setActionHistory] = React.useState<WorkItemActionRead[]>([])
  const [isDrawerLoading, setIsDrawerLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<'changes' | 'summary' | 'technical'>('changes')
  const [showOnlyChanges, setShowOnlyChanges] = React.useState(true)

  // Action / Approval State
  const [remarks, setRemarks] = React.useState('')
  const [isSubmittingAction, setIsSubmittingAction] = React.useState(false)

  // Confirmation Modals
  const [confirmApproveModal, setConfirmApproveModal] = React.useState<WorkItemRead | null>(null)
  const [confirmRejectModal, setConfirmRejectModal] = React.useState<WorkItemRead | null>(null)
  const [isBulkApproveModalOpen, setIsBulkApproveModalOpen] = React.useState(false)
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = React.useState(false)
  const [bulkRemarks, setBulkRemarks] = React.useState('')

  // Fetch Pending Work Items
  const fetchWorkItems = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getPendingWorkItems()
      setWorkItems(data)
      refreshPendingCount()
    } catch {
      toast({
        title: 'Error Loading Work Queue',
        description: 'Failed to retrieve pending work items list.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast, refreshPendingCount])

  React.useEffect(() => {
    fetchWorkItems()
  }, [fetchWorkItems])

  const [searchParams] = useSearchParams()
  const targetWorkItemParam = searchParams.get('workItem')
  const [highlightedWorkItemNum, setHighlightedWorkItemNum] = React.useState<string | null>(null)
  const hasHandledUrlParamRef = React.useRef(false)

  // Open Drawer & Load Details
  const handleInspect = React.useCallback(async (item: WorkItemRead) => {
    setSelectedWorkItem(item)
    setPayloadData(null)
    setActionHistory([])
    setRemarks('')
    setActiveTab('changes')
    setShowOnlyChanges(true)
    setIsDrawerLoading(true)

    try {
      const [pData, hData] = await Promise.all([
        apiService.getWorkItemPayload(item.id).catch(() => null),
        apiService.getWorkItemHistory(item.id).catch(() => []),
      ])
      setPayloadData(pData)
      setActionHistory(hData)
    } catch {
      toast({
        title: 'Error Loading Item Details',
        description: 'Could not fetch full payload or action history.',
        variant: 'destructive',
      })
    } finally {
      setIsDrawerLoading(false)
    }
  }, [toast])

  // Handle URL navigation parameter (?workItem=MC-XXXXXXXX)
  React.useEffect(() => {
    if (!isLoading && workItems.length >= 0 && targetWorkItemParam && !hasHandledUrlParamRef.current) {
      hasHandledUrlParamRef.current = true
      const targetQuery = targetWorkItemParam.trim().toUpperCase()
      const foundItem = workItems.find(
        (wi) =>
          wi.work_item_number?.toUpperCase() === targetQuery ||
          String(wi.id) === targetQuery
      )

      if (foundItem) {
        setHighlightedWorkItemNum(foundItem.work_item_number)
        handleInspect(foundItem)
        setTimeout(() => {
          const el = document.getElementById(`work-item-row-${foundItem.id}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 150)
      } else {
        toast({
          title: 'Work Item Unavailable',
          description: `Work item ${targetWorkItemParam} is no longer pending or is unavailable.`,
          variant: 'destructive',
        })
      }
    }
  }, [isLoading, workItems, targetWorkItemParam, handleInspect, toast])

  // Handle Approve Execution
  const handleExecuteApprove = async (item: WorkItemRead) => {
    setIsSubmittingAction(true)
    try {
      await apiService.approveWorkItem(item.id, remarks.trim() || undefined)
      toast({
        title: 'Work Item Approved',
        description: `Successfully approved request ${item.work_item_number}.`,
      })
      setConfirmApproveModal(null)
      setSelectedWorkItem(null)
      setRemarks('')
      fetchWorkItems()
      await refreshPendingCount()
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to approve work item.'
      toast({
        title: 'Approval Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Handle Reject Execution
  const handleExecuteReject = async (item: WorkItemRead) => {
    if (!remarks.trim()) {
      toast({
        title: 'Remarks Required',
        description: 'You must specify rejection remarks before rejecting a work item.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmittingAction(true)
    try {
      await apiService.rejectWorkItem(item.id, remarks.trim())
      toast({
        title: 'Work Item Rejected',
        description: `Rejected work item ${item.work_item_number}.`,
      })
      setConfirmRejectModal(null)
      setSelectedWorkItem(null)
      setRemarks('')
      fetchWorkItems()
      await refreshPendingCount()
    } catch (err: any) {
      const msg = err?.message || err?.detail || 'Failed to reject work item.'
      toast({
        title: 'Rejection Error',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Sorting Handler
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

  // Filtered & Sorted Work Items
  const filteredWorkItems = React.useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    let list = workItems.filter((item) => {
      const matchesSearch =
        item.work_item_number.toLowerCase().includes(query) ||
        item.entity_type_code.toLowerCase().includes(query) ||
        item.created_by.toLowerCase().includes(query) ||
        String(item.entity_id).includes(query)

      const matchesEntity =
        entityTypeFilter === 'ALL' || item.entity_type_code === entityTypeFilter

      const matchesOp =
        operationFilter === 'ALL' || item.operation_code === operationFilter

      return matchesSearch && matchesEntity && matchesOp
    })

    if (sortField && sortOrder) {
      list = [...list].sort((a: any, b: any) => {
        const aVal = a[sortField] ?? ''
        const bVal = b[sortField] ?? ''
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    return list
  }, [workItems, searchQuery, entityTypeFilter, operationFilter, sortField, sortOrder])

  const getKey = React.useCallback((item: WorkItemRead) => item.id, [])

  // Reusable Row Selection Hook
  const {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<WorkItemRead>({
    items: filteredWorkItems,
    getKey,
  })

  const handleExecuteBulkApprove = async () => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setIsSubmittingAction(true)
    let successCount = 0
    let failureCount = 0
    const rem = bulkRemarks.trim() || undefined

    for (const id of ids) {
      try {
        await apiService.approveWorkItem(Number(id), rem)
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }

    setIsSubmittingAction(false)
    setIsBulkApproveModalOpen(false)
    setBulkRemarks('')
    clearSelection()
    fetchWorkItems()
    await refreshPendingCount()

    toast({
      title: 'Bulk Approval Completed',
      description: `Successfully approved ${successCount} work item(s).${
        failureCount > 0 ? ` ${failureCount} request(s) failed or were blocked by governance rules (e.g. self-approval).` : ''
      }`,
      variant: failureCount > 0 && successCount === 0 ? 'destructive' : 'info',
    })
  }

  const handleExecuteBulkReject = async () => {
    if (selectedIds.size === 0) return
    if (!bulkRemarks.trim()) {
      toast({
        title: 'Remarks Required',
        description: 'You must specify rejection remarks for bulk rejection.',
        variant: 'destructive',
      })
      return
    }
    const ids = Array.from(selectedIds)
    setIsSubmittingAction(true)
    let successCount = 0
    let failureCount = 0
    const rem = bulkRemarks.trim()

    for (const id of ids) {
      try {
        await apiService.rejectWorkItem(Number(id), rem)
        successCount++
      } catch (err: any) {
        failureCount++
      }
    }

    setIsSubmittingAction(false)
    setIsBulkRejectModalOpen(false)
    setBulkRemarks('')
    clearSelection()
    fetchWorkItems()
    await refreshPendingCount()

    toast({
      title: 'Bulk Rejection Completed',
      description: `Rejected ${successCount} work item(s).${
        failureCount > 0 ? ` ${failureCount} request(s) failed.` : ''
      }`,
      variant: failureCount > 0 && successCount === 0 ? 'destructive' : 'info',
    })
  }

  // Unique Entity Types & Operations for Filter Selects
  const availableEntityTypes = React.useMemo(() => {
    const set = new Set<string>()
    workItems.forEach((w) => set.add(w.entity_type_code))
    return Array.from(set)
  }, [workItems])

  const availableOperations = React.useMemo(() => {
    const set = new Set<string>()
    workItems.forEach((w) => set.add(w.operation_code))
    return Array.from(set)
  }, [workItems])

  // Helper: Humanize Value
  const humanizeValue = (val: any): string => {
    if (val === true) return 'Yes / Active'
    if (val === false) return 'No / Inactive'
    if (val === null || val === undefined || val === '') return 'None / Unset'
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  // Helper: Humanize Field Key
  const humanizeFieldKey = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }

  // Parse Diff Items from Payload
  const parsedDiffItems = React.useMemo<ParsedDiffItem[]>(() => {
    if (!payloadData) return []
    let beforeObj: Record<string, any> = {}
    let afterObj: Record<string, any> = {}

    try {
      if (payloadData.before_payload) {
        beforeObj =
          typeof payloadData.before_payload === 'string'
            ? JSON.parse(payloadData.before_payload)
            : payloadData.before_payload
      }
    } catch {
      beforeObj = {}
    }

    try {
      if (payloadData.after_payload) {
        afterObj =
          typeof payloadData.after_payload === 'string'
            ? JSON.parse(payloadData.after_payload)
            : payloadData.after_payload
      }
    } catch {
      afterObj = {}
    }

    const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))
    const ignoreList = ['created_by', 'created_date', 'last_modified_by', 'last_modified_date', 'client_id', 'id']

    const diffs: ParsedDiffItem[] = []

    allKeys.forEach((key) => {
      if (ignoreList.includes(key.toLowerCase())) return

      const beforeVal = beforeObj[key]
      const afterVal = afterObj[key]

      const hasBefore = key in beforeObj && beforeVal !== undefined
      const hasAfter = key in afterObj && afterVal !== undefined

      let changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED' = 'UNCHANGED'
      let isChanged = false

      if (!hasBefore && hasAfter) {
        changeType = 'ADDED'
        isChanged = true
      } else if (hasBefore && !hasAfter) {
        changeType = 'REMOVED'
        isChanged = true
      } else if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changeType = 'MODIFIED'
        isChanged = true
      }

      diffs.push({
        fieldKey: key,
        label: humanizeFieldKey(key),
        beforeVal,
        afterVal,
        isChanged,
        changeType,
      })
    })

    return diffs
  }, [payloadData])

  // Check SoD Rule (Maker cannot approve their own work item)
  const isMakerSelfApproval = React.useMemo(() => {
    if (!selectedWorkItem) return false
    const makerId = selectedWorkItem.created_by.toLowerCase().trim()
    const curUserId = currentUser.user_id.toLowerCase().trim()
    const curUsername = currentUser.username.toLowerCase().trim()
    return makerId === curUserId || makerId === curUsername
  }, [selectedWorkItem, currentUser])

  // Operation Badge Color Helper
  const renderOperationBadge = (op: string) => {
    switch (op) {
      case 'CREATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">CREATE</span>
      case 'UPDATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">UPDATE</span>
      case 'ACTIVATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">ACTIVATE</span>
      case 'DEACTIVATE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">DEACTIVATE</span>
      case 'DELETE':
      case 'REMOVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">{op}</span>
      case 'REORDER':
      case 'ASSIGN':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">{op}</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{op}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Security & Governance' },
            { label: 'Maker-Checker Queue' },
          ]}
        />
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Maker-Checker Approval Queue
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="h-3.5 w-3.5" />
                {workItems.length} Pending
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review, inspect, approve, or reject administrative configuration work items.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWorkItems}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Toolbar (SCR-MC-001) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by Work Item #, Entity, Maker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Filter className="h-3.5 w-3.5" />
            Filters:
          </div>

          <select
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Entity Types</option>
            {availableEntityTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>

          <select
            value={operationFilter}
            onChange={(e) => setOperationFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Operations</option>
            {availableOperations.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selection Status Bar */}
      {selectedCount > 0 && (
        <SelectionToolbar
          selectedCount={selectedCount}
          totalCount={filteredWorkItems.length}
          onClearSelection={clearSelection}
          onBulkApprove={() => {
            setBulkRemarks('')
            setIsBulkApproveModalOpen(true)
          }}
          onBulkReject={() => {
            setBulkRemarks('')
            setIsBulkRejectModalOpen(true)
          }}
        />
      )}

      {/* Main Work Items DataGrid (SCR-MC-001) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium">Loading pending work items...</p>
          </div>
        ) : filteredWorkItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <ShieldCheck className="h-12 w-12 text-emerald-500 mx-auto opacity-75" />
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No Pending Work Items
            </p>
            <p className="text-sm max-w-sm mx-auto">
              All submitted configuration change requests have been processed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 text-center w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isSomeSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all work items"
                    />
                  </th>
                  <th className="py-3 px-4">
                    <SortableHeader
                      label="Work Item #"
                      sortField="work_item_number"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4">
                    <SortableHeader
                      label="Entity Type"
                      sortField="entity_type_code"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Target Entity ID
                  </th>
                  <th className="py-3 px-4">
                    <SortableHeader
                      label="Operation"
                      sortField="operation_code"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                    Maker (Submitted By)
                  </th>
                  <th className="py-3 px-4">
                    <SortableHeader
                      label="Submission Date"
                      sortField="created_date"
                      currentSortField={sortField}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  </th>
                  <th className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredWorkItems.map((item) => {
                  const selected = isSelected(item.id)
                  return (
                    <tr
                      key={item.id}
                      id={`work-item-row-${item.id}`}
                      className={cn(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors',
                        selected && 'bg-blue-50/60 dark:bg-blue-950/30',
                        highlightedWorkItemNum === item.work_item_number && 'bg-amber-50/90 dark:bg-amber-950/50 ring-2 ring-amber-500/80'
                      )}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleRow(item.id)}
                          aria-label={`Select work item ${item.work_item_number}`}
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {item.work_item_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {item.entity_type_code}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono">
                      #{item.entity_id}
                    </td>
                    <td className="py-3.5 px-4">
                      {renderOperationBadge(item.operation_code)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {item.created_by}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {formatDate(item.created_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={item.status_code as any} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip content="Inspect Details & Payload Diff">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInspect(item)}
                            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-400 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Approve Work Item">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmApproveModal(item)}
                            className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="Reject Work Item">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmRejectModal(item)}
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SCR-MC-002 & SCR-MC-003: Work Item Details Right-Side Drawer */}
      <Sheet
        isOpen={!!selectedWorkItem}
        onClose={() => setSelectedWorkItem(null)}
        title={selectedWorkItem ? selectedWorkItem.work_item_number : 'Work Item Details'}
      >
        {selectedWorkItem && (
          <div className="flex flex-col h-full space-y-6">
            {/* Header Meta Overview */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-semibold uppercase">
                    Target Entity
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {payloadData?.entity_name || `${selectedWorkItem.entity_type_code} #${selectedWorkItem.entity_id}`}
                  </div>
                </div>
                <StatusBadge status={selectedWorkItem.status_code as any} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <div>
                  <span className="text-slate-400">Entity Type:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedWorkItem.entity_type_code}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Entity ID:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    #{selectedWorkItem.entity_id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Maker Username:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedWorkItem.created_by}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Submitted Date:</span>{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedWorkItem.created_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* SoD Warning Banner */}
            {isMakerSelfApproval && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Segregation of Duties (SoD) Enforced</p>
                  <p className="mt-0.5">
                    You submitted this work item as Maker. You cannot approve your own submission.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Tabs (Refinement #3: Changes | Summary | Technical) */}
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('changes')}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'changes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Changes
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'summary'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ListFilter className="h-3.5 w-3.5" />
                Summary
              </button>

              <button
                onClick={() => setActiveTab('technical')}
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === 'technical'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                Technical
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 space-y-4 overflow-y-auto">
              {/* TAB 1: CHANGES (Business-friendly diff) */}
              {activeTab === 'changes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Field-by-Field Business Comparison
                    </h3>
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyChanges}
                        onChange={(e) => setShowOnlyChanges(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Highlight modified fields only</span>
                    </label>
                  </div>

                  {isDrawerLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Loading payload diff...
                    </div>
                  ) : parsedDiffItems.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-md text-center text-slate-500 text-xs">
                      No field diff details available for this request.
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300">
                            <th className="py-2.5 px-3">Field Name</th>
                            <th className="py-2.5 px-3">Previous Value (Before)</th>
                            <th className="py-2.5 px-3">New Value (After)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {parsedDiffItems
                            .filter((item) => !showOnlyChanges || item.isChanged)
                            .map((diff, idx) => (
                              <tr
                                key={idx}
                                className={
                                  diff.isChanged
                                    ? 'bg-amber-50/60 dark:bg-amber-950/20 font-medium'
                                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }
                              >
                                <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                                  {diff.label}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                  {humanizeValue(diff.beforeVal)}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                                  {humanizeValue(diff.afterVal)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SUMMARY */}
              {activeTab === 'summary' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Change Summary
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    {actionHistory.length > 0 && actionHistory[0].change_summary ? (
                      <p className="leading-relaxed font-medium">{actionHistory[0].change_summary}</p>
                    ) : (
                      <p className="text-slate-500">
                        {selectedWorkItem.operation_code} request submitted for{' '}
                        {payloadData?.entity_name || selectedWorkItem.entity_type_code}.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TECHNICAL (Raw JSON) */}
              {activeTab === 'technical' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">
                      Before Payload JSON
                    </h4>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono overflow-x-auto border border-slate-800 max-h-40">
                      {payloadData?.before_payload
                        ? JSON.stringify(
                            typeof payloadData.before_payload === 'string'
                              ? JSON.parse(payloadData.before_payload)
                              : payloadData.before_payload,
                            null,
                            2
                          )
                        : 'null'}
                    </pre>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">
                      After Payload JSON
                    </h4>
                    <pre className="p-3 bg-slate-900 text-slate-200 rounded-md text-[11px] font-mono overflow-x-auto border border-slate-800 max-h-40">
                      {payloadData?.after_payload
                        ? JSON.stringify(
                            typeof payloadData.after_payload === 'string'
                              ? JSON.parse(payloadData.after_payload)
                              : payloadData.after_payload,
                            null,
                            2
                          )
                        : 'null'}
                    </pre>
                  </div>
                </div>
              )}

              {/* SCR-MC-003: Approval History Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Approval Action History (SCR-MC-003)
                </h3>

                {actionHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No action history recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {actionHistory.map((act) => (
                      <div
                        key={act.id}
                        className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              #{act.action_sequence} {act.action_by}
                            </span>
                            <StatusBadge status={act.status_code as any} />
                          </div>
                          {act.remarks && (
                            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                              "{act.remarks}"
                            </p>
                          )}
                          {act.change_summary && (
                            <p className="text-slate-500 text-[10px] italic">
                              {act.change_summary}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDate(act.action_date)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Footer & Remarks Input */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Approval / Rejection Remarks
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter optional approval remarks or required rejection reason..."
                  className="w-full text-xs p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedWorkItem(null)}
                >
                  Close
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmRejectModal(selectedWorkItem)}
                  disabled={isSubmittingAction}
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setConfirmApproveModal(selectedWorkItem)}
                  disabled={isMakerSelfApproval || isSubmittingAction}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Approve Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Confirmation Modal: APPROVE */}
      {confirmApproveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirm Approval
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to approve work item{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {confirmApproveModal.work_item_number}
              </strong>{' '}
              ({confirmApproveModal.operation_code} {confirmApproveModal.entity_type_code})? This change will take immediate effect.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmApproveModal(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExecuteApprove(confirmApproveModal)}
                disabled={isSubmittingAction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingAction ? 'Approving...' : 'Confirm Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: REJECT */}
      {confirmRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirm Rejection
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to reject work item{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {confirmRejectModal.work_item_number}
              </strong>{' '}
              ({confirmRejectModal.operation_code} {confirmRejectModal.entity_type_code})?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Remarks <span className="text-rose-500">* (Required)</span>
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter mandatory reason for rejection..."
                className="w-full text-xs p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmRejectModal(null)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleExecuteReject(confirmRejectModal)}
                disabled={isSubmittingAction || !remarks.trim()}
              >
                {isSubmittingAction ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: BULK APPROVE */}
      {isBulkApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirm Bulk Approval
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to approve <strong className="font-bold text-slate-900 dark:text-slate-100">{selectedCount}</strong> selected work item(s)? Approved changes will take immediate effect.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Approval Remarks <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Enter optional bulk approval remarks..."
                className="w-full text-xs p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkApproveModalOpen(false)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteBulkApprove}
                disabled={isSubmittingAction}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingAction ? 'Approving...' : `Approve ${selectedCount} Item(s)`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: BULK REJECT */}
      {isBulkRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <XCircle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Confirm Bulk Rejection
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to reject <strong className="font-bold text-slate-900 dark:text-slate-100">{selectedCount}</strong> selected work item(s)?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rejection Remarks <span className="text-rose-500">* (Required)</span>
              </label>
              <textarea
                rows={3}
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Enter mandatory reason for bulk rejection..."
                className="w-full text-xs p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkRejectModalOpen(false)}
                disabled={isSubmittingAction}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleExecuteBulkReject}
                disabled={isSubmittingAction || !bulkRemarks.trim()}
              >
                {isSubmittingAction ? 'Rejecting...' : `Reject ${selectedCount} Item(s)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
