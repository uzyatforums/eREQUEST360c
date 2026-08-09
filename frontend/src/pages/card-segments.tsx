import * as React from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Layers,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  Clock,
} from 'lucide-react'
import { CardSegment, CardSegmentProgrammeRead, CardProgramme, UserInfo } from '../types'
import { apiService } from '../services/api'
import { Breadcrumb } from '../components/ui/breadcrumb'
import { StatusBadge } from '../components/ui/status-badge'
import { Button } from '../components/ui/button'
import { Tooltip } from '../components/ui/tooltip'
import { Sheet } from '../components/ui/sheet'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { useToast } from '../components/ui/toast'
import { SortableHeader, SortOrder } from '../components/ui/sortable-header'
import { useWorkQueue } from '../context/work-queue-context'
import { Dialog } from '../components/ui/dialog'

export interface CardSegmentsPageProps {
  currentUser: UserInfo
}

export const CardSegmentsPage: React.FC<CardSegmentsPageProps> = ({ currentUser }) => {
  const { toast } = useToast()
  const { refreshPendingCount } = useWorkQueue()

  const [segments, setSegments] = React.useState<CardSegment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'active' | 'inactive'>('all')

  // Sorting
  const [sortField, setSortField] = React.useState<string | null>('priority')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc')

  // Create / Edit Drawer
  const [isFormDrawerOpen, setIsFormDrawerOpen] = React.useState(false)
  const [editingSegment, setEditingSegment] = React.useState<CardSegment | null>(null)
  const [segmentCodeInput, setSegmentCodeInput] = React.useState('')
  const [segmentNameInput, setSegmentNameInput] = React.useState('')
  const [priorityInput, setPriorityInput] = React.useState<number>(1)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Inspector Drawer
  const [inspectingSegment, setInspectingSegment] = React.useState<CardSegment | null>(null)

  // Confirmation Modal state for Toggle Active
  const [toggleSegment, setToggleSegment] = React.useState<CardSegment | null>(null)
  const [isToggling, setIsToggling] = React.useState(false)

  // Permission state
  const [canManage, setCanManage] = React.useState<boolean>(false)

  React.useEffect(() => {
    let mounted = true
    apiService
      .getIAMPermissions()
      .then((perms) => {
        if (mounted) {
          const hasManage = perms.some((p) => p.permission_code === 'config.manage')
          const isSuperAdmin = currentUser.roles.includes('super_admin')
          setCanManage(hasManage || isSuperAdmin)
        }
      })
      .catch(() => {
        if (mounted) {
          setCanManage(
            currentUser.roles.some((r) =>
              ['super_admin', 'control_maker', 'operations_admin_maker', 'operations_admin_checker'].includes(r)
            )
          )
        }
      })
    return () => {
      mounted = false
    }
  }, [currentUser])

  // Programme Assignment Drawer
  const [managingSegment, setManagingSegment] = React.useState<CardSegment | null>(null)
  const [assignedProgrammes, setAssignedProgrammes] = React.useState<CardSegmentProgrammeRead[]>([])
  const [availableProgrammes, setAvailableProgrammes] = React.useState<CardProgramme[]>([])
  const [selectedProgrammeId, setSelectedProgrammeId] = React.useState<string>('')
  const [assignDescription, setAssignDescription] = React.useState('')
  const [isAssigning, setIsAssigning] = React.useState(false)

  const fetchSegments = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const activeParam = activeFilter === 'active' ? true : activeFilter === 'inactive' ? false : undefined
      const data = await apiService.getCardSegments({ active: activeParam })
      setSegments(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load card segments.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, toast])

  React.useEffect(() => {
    fetchSegments()
  }, [fetchSegments])

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

  const filteredSegments = React.useMemo(() => {
    const list = segments.filter(
      (s) =>
        s.segment_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.segment_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!sortField || !sortOrder) return list

    return [...list].sort((a: any, b: any) => {
      const valA = a[sortField] ?? ''
      const valB = b[sortField] ?? ''

      let comp = 0
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB
      } else {
        comp = String(valA).localeCompare(String(valB))
      }

      return sortOrder === 'asc' ? comp : -comp
    })
  }, [segments, searchQuery, sortField, sortOrder])

  // Form Reset / Open
  const handleOpenCreate = () => {
    setEditingSegment(null)
    setSegmentCodeInput('')
    setSegmentNameInput('')
    setPriorityInput(1)
    setIsFormDrawerOpen(true)
  }

  const handleOpenEdit = (seg: CardSegment) => {
    setEditingSegment(seg)
    setSegmentCodeInput(seg.segment_code)
    setSegmentNameInput(seg.segment_name)
    setPriorityInput(seg.priority)
    setIsFormDrawerOpen(true)
  }

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!segmentNameInput.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Segment Name is required.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingSegment) {
        const res = await apiService.updateCardSegment(editingSegment.id, {
          segment_name: segmentNameInput.trim(),
          priority: Number(priorityInput),
        })
        if (res.status === 'PENDING_APPROVAL') {
          toast({
            title: 'Submitted for Approval',
            description: `Update submitted. Work item ID: ${res.work_item_id}`,
          })
        } else {
          toast({
            title: 'Card Segment Updated',
            description: `Successfully updated '${editingSegment.segment_code}'.`,
          })
        }
      } else {
        if (!segmentCodeInput.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Segment Code is required.',
            variant: 'destructive',
          })
          setIsSubmitting(false)
          return
        }

        const res = await apiService.createCardSegment({
          segment_code: segmentCodeInput.trim().toUpperCase(),
          segment_name: segmentNameInput.trim(),
          priority: Number(priorityInput),
        })
        if (res.status === 'PENDING_APPROVAL') {
          toast({
            title: 'Submitted for Approval',
            description: `Creation submitted. Work item ID: ${res.work_item_id}`,
          })
        } else {
          toast({
            title: 'Card Segment Created',
            description: `Successfully created '${segmentCodeInput.toUpperCase()}'.`,
          })
        }
      }
      setIsFormDrawerOpen(false)
      fetchSegments()
      await refreshPendingCount()
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'An error occurred while saving card segment.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirm Toggle Activate / Deactivate Handler
  const handleConfirmToggle = async () => {
    if (!toggleSegment) return
    setIsToggling(true)
    try {
      if (toggleSegment.active) {
        const res = await apiService.deactivateCardSegment(toggleSegment.id)
        if (res.status === 'PENDING_APPROVAL') {
          toast({ title: 'Submitted for Approval', description: `Deactivation submitted.` })
        } else {
          toast({ title: 'Segment Deactivated', description: `Deactivated '${toggleSegment.segment_code}'.` })
        }
      } else {
        const res = await apiService.activateCardSegment(toggleSegment.id)
        if (res.status === 'PENDING_APPROVAL') {
          toast({ title: 'Submitted for Approval', description: `Activation submitted.` })
        } else {
          toast({ title: 'Segment Activated', description: `Activated '${toggleSegment.segment_code}'.` })
        }
      }
      fetchSegments()
      await refreshPendingCount()
    } catch (err: any) {
      toast({
        title: 'Status Update Failed',
        description: err.message || 'Could not update segment status.',
        variant: 'destructive',
      })
    } finally {
      setIsToggling(false)
      setToggleSegment(null)
    }
  }

  // Programme Assignment Management
  const fetchAssignedProgrammes = React.useCallback(async (segmentId: number) => {
    try {
      const assigned = await apiService.getSegmentProgrammes(segmentId)
      setAssignedProgrammes(assigned)

      // Fetch all card programmes to filter available
      const allProgs = await apiService.getCardProgrammes()
      const assignedIds = new Set(assigned.map((a) => a.card_programme_id))
      const available = allProgs.filter((p) => p.active && !assignedIds.has(p.id))
      setAvailableProgrammes(available)
      if (available.length > 0) {
        setSelectedProgrammeId(String(available[0].id))
      } else {
        setSelectedProgrammeId('')
      }
    } catch {
      toast({
        title: 'Error Loading Programmes',
        description: 'Failed to load assigned card programmes.',
        variant: 'destructive',
      })
    }
  }, [toast])

  const handleOpenProgrammes = (seg: CardSegment) => {
    setManagingSegment(seg)
    fetchAssignedProgrammes(seg.id)
  }

  const handleAssignProgramme = async () => {
    if (!managingSegment || !selectedProgrammeId) return
    setIsAssigning(true)
    try {
      const res = await apiService.assignSegmentProgramme(managingSegment.id, {
        card_programme_id: Number(selectedProgrammeId),
        description: assignDescription.trim() || undefined,
      })
      if (res.status === 'PENDING_APPROVAL') {
        toast({ title: 'Submitted for Approval', description: 'Programme assignment pending approval.' })
      } else {
        toast({ title: 'Programme Assigned', description: 'Card programme assigned to segment.' })
      }
      setAssignDescription('')
      fetchAssignedProgrammes(managingSegment.id)
      fetchSegments()
      await refreshPendingCount()
    } catch (err: any) {
      toast({
        title: 'Assignment Failed',
        description: err.message || 'Could not assign programme.',
        variant: 'destructive',
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveProgramme = async (progId: number) => {
    if (!managingSegment) return
    try {
      const res = await apiService.removeSegmentProgramme(managingSegment.id, progId)
      if (res.status === 'PENDING_APPROVAL') {
        toast({ title: 'Submitted for Approval', description: 'Programme removal pending approval.' })
      } else {
        toast({ title: 'Programme Removed', description: 'Card programme unassigned.' })
      }
      fetchAssignedProgrammes(managingSegment.id)
      fetchSegments()
      await refreshPendingCount()
    } catch (err: any) {
      toast({
        title: 'Removal Failed',
        description: err.message || 'Could not remove programme.',
        variant: 'destructive',
      })
    }
  }

  const handleReorder = async (progId: number, direction: 'UP' | 'DOWN') => {
    if (!managingSegment) return
    try {
      await apiService.reorderSegmentProgramme(managingSegment.id, {
        card_programme_id: progId,
        direction,
      })
      fetchAssignedProgrammes(managingSegment.id)
      await refreshPendingCount()
    } catch (err: any) {
      toast({
        title: 'Reorder Failed',
        description: err.message || 'Could not reorder priority.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[
            { label: 'Configuration' },
            { label: 'Card Segments' },
          ]}
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Card Segments Master</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage customer card segments, brand priorities, and card programme assignment rules (SCR-004).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchSegments} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canManage && (
              <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                <Plus className="w-4 h-4 mr-2" />
                New Card Segment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Status Filter & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search segment code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</span>
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-32 text-xs"
              options={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground w-full sm:w-auto justify-end">
          <div>
            Total Segments: <span className="font-semibold text-foreground">{segments.length}</span>
          </div>
          <div>
            Active: <span className="font-semibold text-emerald-600">{segments.filter((s) => s.active).length}</span>
          </div>
          <div>
            Inactive: <span className="font-semibold text-amber-600">{segments.filter((s) => !s.active).length}</span>
          </div>
        </div>
      </div>

      {/* Segments DataGrid */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">
                  <SortableHeader label="Segment Code" sortField="segment_code" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="px-4 py-3">
                  <SortableHeader label="Segment Name" sortField="segment_name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="px-4 py-3">
                  <SortableHeader label="Priority" sortField="priority" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="px-4 py-3">Assigned Programmes</th>
                <th className="px-4 py-3">
                  <SortableHeader label="Status" sortField="active" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading Card Segments...
                  </td>
                </tr>
              ) : filteredSegments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No card segments found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredSegments.map((seg) => (
                  <tr key={seg.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground font-mono">{seg.segment_code}</td>
                    <td className="px-4 py-3 text-foreground font-semibold">{seg.segment_name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{seg.priority}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-primary font-medium hover:bg-primary/10"
                        onClick={() => handleOpenProgrammes(seg)}
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        {seg.assigned_programmes_count ?? 0} Programmes
                      </Button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={seg.active ? 'ACTIVE' : 'INACTIVE'} />
                        {seg.has_pending_change && (
                          <Tooltip content={`Pending approval: ${seg.pending_operation_code || 'Change'} (Work Item #${seg.pending_work_item_id})`}>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                              <Clock className="w-3 h-3 mr-1 animate-pulse" />
                              Pending
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="View Segment Details">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setInspectingSegment(seg)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Tooltip>

                        {canManage && (
                          seg.has_pending_change ? (
                            <Tooltip content={`A pending change (Work Item #${seg.pending_work_item_id}) is awaiting approval`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 text-muted-foreground opacity-50 cursor-not-allowed"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Edit Card Segment">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenEdit(seg)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          )
                        )}

                        <Tooltip content={canManage ? "Manage Card Programmes" : "View Card Programmes"}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handleOpenProgrammes(seg)}
                          >
                            <Layers className="w-4 h-4" />
                          </Button>
                        </Tooltip>

                        {canManage && (
                          seg.has_pending_change ? (
                            <Tooltip content={`A pending change (Work Item #${seg.pending_work_item_id}) is awaiting approval`}>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 text-amber-500 opacity-50 cursor-not-allowed"
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip content={seg.active ? 'Deactivate Segment' : 'Activate Segment'}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${seg.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => setToggleSegment(seg)}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Form Drawer */}
      <Sheet
        isOpen={isFormDrawerOpen}
        onClose={() => setIsFormDrawerOpen(false)}
        title={editingSegment ? `Edit Segment '${editingSegment.segment_code}'` : 'Create New Card Segment'}
        description="Configure customer card segment attributes and global priority ranking."
      >
        <form onSubmit={handleSaveSegment} className="space-y-4 pt-4">
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1">
              Segment Code <span className="text-red-500">*</span>
            </label>
            <Input
              value={segmentCodeInput}
              onChange={(e) => setSegmentCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. 01, HNI, YOUTH"
              disabled={!!editingSegment}
              maxLength={10}
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">Unique alphanumeric code per tenant (max 10 chars).</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1">
              Segment Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={segmentNameInput}
              onChange={(e) => setSegmentNameInput(e.target.value)}
              placeholder="e.g. High Net Worth Individuals"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1">
              Segment Priority / Ranking
            </label>
            <Input
              type="number"
              value={priorityInput}
              onChange={(e) => setPriorityInput(parseInt(e.target.value) || 1)}
              min={1}
            />
            <p className="text-xs text-muted-foreground mt-1">Lower priority number indicates higher matching precedence.</p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setIsFormDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingSegment ? 'Update Segment' : 'Create Segment'}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Segment Inspector Drawer */}
      <Sheet
        isOpen={!!inspectingSegment}
        onClose={() => setInspectingSegment(null)}
        title={`Segment Details: ${inspectingSegment?.segment_code}`}
        description="Read-only view of configuration segment properties and audit metadata."
      >
        {inspectingSegment && (
          <div className="space-y-6 pt-4 text-sm">
            <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-lg border">
              <div>
                <span className="text-xs text-muted-foreground uppercase block font-semibold">Segment Code</span>
                <span className="font-mono font-bold text-foreground text-base">{inspectingSegment.segment_code}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase block font-semibold">Status</span>
                <StatusBadge status={inspectingSegment.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground uppercase block font-semibold">Segment Name</span>
                <span className="font-semibold text-foreground">{inspectingSegment.segment_name}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase block font-semibold">Priority</span>
                <span className="font-mono text-foreground">{inspectingSegment.priority}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase block font-semibold">Assigned Programmes</span>
                <span className="font-semibold text-primary">{inspectingSegment.assigned_programmes_count ?? 0}</span>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-primary" /> Audit Metadata
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Created By:</span>
                  <span className="font-medium text-foreground">{inspectingSegment.created_by}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Created Date:</span>
                  <span className="font-medium text-foreground">{inspectingSegment.created_date ? new Date(inspectingSegment.created_date).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Last Modified By:</span>
                  <span className="font-medium text-foreground">{inspectingSegment.last_modified_by || 'None'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Last Modified Date:</span>
                  <span className="font-medium text-foreground">{inspectingSegment.last_modified_date ? new Date(inspectingSegment.last_modified_date).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setInspectingSegment(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Programme Selection Assignment Drawer */}
      <Sheet
        isOpen={!!managingSegment}
        onClose={() => setManagingSegment(null)}
        title={canManage ? `Programme Selection Assignment: ${managingSegment?.segment_code}` : `Assigned Programmes: ${managingSegment?.segment_code}`}
        description={canManage ? `Manage ordered list of card programmes assigned to '${managingSegment?.segment_name}'. Selection priority determines auto-allocation order for requests.` : `View ordered list of card programmes assigned to '${managingSegment?.segment_name}'.`}
      >
        {managingSegment && (
          <div className="space-y-6 pt-4 text-sm">
            {/* Add Programme Box */}
            {canManage && (
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4" /> Assign Card Programme
                </h4>
                <div className="space-y-2">
                  <Select
                    value={selectedProgrammeId}
                    onChange={(e) => setSelectedProgrammeId(e.target.value)}
                    options={
                      availableProgrammes.length > 0
                        ? availableProgrammes.map((p) => ({
                            value: String(p.id),
                            label: `${p.card_programme_code} - ${p.card_programme_name} (${p.card_type})`,
                          }))
                        : [{ value: '', label: 'No additional active programmes available' }]
                    }
                    disabled={availableProgrammes.length === 0}
                  />

                  <Input
                    placeholder="Optional assignment description / notes..."
                    value={assignDescription}
                    onChange={(e) => setAssignDescription(e.target.value)}
                    disabled={availableProgrammes.length === 0}
                  />

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={handleAssignProgramme}
                    disabled={!selectedProgrammeId || availableProgrammes.length === 0 || isAssigning}
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Programme to Segment'}
                  </Button>
                </div>
              </div>
            )}

            {/* Assigned Programmes List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Assigned Card Programmes ({assignedProgrammes.length})</span>
              </h4>

              {assignedProgrammes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg border">
                  No card programmes assigned to this segment yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedProgrammes.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-card border rounded-lg hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                          #{item.priority}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{item.card_programme_name}</span>
                            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded border text-muted-foreground">
                              {item.card_brand}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{item.card_programme_code}</div>
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Tooltip content="Move Up Priority">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleReorder(item.card_programme_id, 'UP')}
                              disabled={idx === 0}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>

                          <Tooltip content="Move Down Priority">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleReorder(item.card_programme_id, 'DOWN')}
                              disabled={idx === assignedProgrammes.length - 1}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>

                          <Tooltip content="Unassign Programme">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              onClick={() => handleRemoveProgramme(item.card_programme_id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setManagingSegment(null)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Activate / Deactivate Confirmation Dialog */}
      <Dialog
        isOpen={!!toggleSegment}
        onClose={() => setToggleSegment(null)}
        onConfirm={handleConfirmToggle}
        title={toggleSegment?.active ? `Deactivate Card Segment ${toggleSegment?.segment_code}?` : `Activate Card Segment ${toggleSegment?.segment_code}?`}
        description={
          toggleSegment?.active
            ? `Are you sure you want to deactivate '${toggleSegment?.segment_name}'? This will submit a deactivation request for review. Deactivating this segment will restrict card allocations.`
            : `Are you sure you want to activate '${toggleSegment?.segment_name}'? This will submit an activation request for review.`
        }
        confirmText={toggleSegment?.active ? 'Deactivate Segment' : 'Activate Segment'}
        cancelText="Cancel"
        variant={toggleSegment?.active ? 'destructive' : 'primary'}
        isLoading={isToggling}
      />
    </div>
  )
}
