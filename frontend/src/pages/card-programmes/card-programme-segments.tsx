import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Trash2,
  Star,
  RefreshCw,
} from 'lucide-react'
import { CardProgramme, CardProgrammeSegment, UserInfo } from '../../types'
import { apiService } from '../../services/api'
import { ParentSummaryBanner } from '../../components/card-programmes/parent-summary-banner'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { StatusBadge } from '../../components/ui/status-badge'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Sheet } from '../../components/ui/sheet'
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toast'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { useRowSelection } from '../../hooks/use-row-selection'

export interface CardProgrammeSegmentsProps {
  programme: CardProgramme
  currentUser: UserInfo
  onBackToDetails?: () => void
  onBackToList?: () => void
  onEditParent?: () => void
}

export const CardProgrammeSegments: React.FC<CardProgrammeSegmentsProps> = ({
  programme,
  currentUser,
  onBackToDetails,
  onBackToList,
  onEditParent,
}) => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [segments, setSegments] = React.useState<CardProgrammeSegment[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isAssignSheetOpen, setIsAssignSheetOpen] = React.useState(false)

  const handleBackToDetails = () => {
    if (onBackToDetails) onBackToDetails()
    navigate(`/card-programmes/${programme.id}`)
  }

  const handleBackToList = () => {
    if (onBackToList) onBackToList()
    navigate('/card-programmes')
  }

  const handleEditParent = () => {
    if (onEditParent) onEditParent()
    navigate(`/card-programmes/${programme.id}/edit`)
  }

  // Form state for assigning new segment
  const [segmentCode, setSegmentCode] = React.useState('SEG_CORPORATE')
  const [segmentName, setSegmentName] = React.useState('Corporate Account Segment')
  const [priority, setPriority] = React.useState(3)
  const [isDefault, setIsDefault] = React.useState(false)

  const fetchSegments = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammeSegments(programme.id)
      setSegments(data)
    } catch {
      toast({
        title: 'Error Loading Segments',
        description: 'Failed to retrieve card programme segments.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [programme.id, toast])

  React.useEffect(() => {
    fetchSegments()
  }, [fetchSegments])

  const filteredSegments = React.useMemo(() => {
    return segments.filter(
      (s) =>
        s.segment_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.segment_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [segments, searchQuery])

  // Selection Hook
  const {
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<CardProgrammeSegment>({
    items: filteredSegments,
    getKey: (s) => s.id,
  })

  const canManage = currentUser.roles.some((r) =>
    ['super_admin', 'operations_admin_maker', 'operations_admin_checker'].includes(r)
  )

  const handleAssignSegment = (e: React.FormEvent) => {
    e.preventDefault()
    const newSeg: CardProgrammeSegment = {
      id: Date.now(),
      segment_code: segmentCode,
      segment_name: segmentName,
      priority: Number(priority),
      is_default: isDefault,
      active: true,
      charge_profile_name: `${programme.card_type} Segment Fee Profile`,
    }
    setSegments((prev) => [...prev, newSeg])
    setIsAssignSheetOpen(false)
    toast({
      title: 'Segment Assigned',
      description: `Assigned customer segment '${segmentName}' to programme.`,
      variant: 'success',
    })
  }

  const handleRemoveSegment = (id: number, name: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
    toast({
      title: 'Segment Removed',
      description: `Removed customer segment '${name}'.`,
      variant: 'info',
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: handleBackToList },
          { label: 'Card Programmes', onClick: handleBackToList },
          { label: programme.card_programme_code, onClick: handleBackToDetails },
          { label: 'Segments' },
        ]}
      />

      {/* Parent Summary Banner */}
      <ParentSummaryBanner
        programme={programme}
        onEditParent={handleEditParent}
        onBackToDetails={handleBackToDetails}
        onBackToList={handleBackToList}
        currentChildName="Customer Segment Eligibility"
      />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search segment code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="primary" size="sm" onClick={() => setIsAssignSheetOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Assign Segment
            </Button>
          )}

          <Tooltip content="Refresh segment list">
            <button
              onClick={fetchSegments}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Selection Status Bar */}
      <SelectionToolbar
        selectedCount={selectedCount}
        totalCount={filteredSegments.length}
        onClearSelection={clearSelection}
      />

      {/* Full-Width Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <Checkbox
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all segments"
                  />
                </th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4">Segment Code</th>
                <th className="py-3 px-4">Segment Name</th>
                <th className="py-3 px-4 text-center">Default Flag</th>
                <th className="py-3 px-4">Fee Profile</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Customer Segments...
                  </td>
                </tr>
              ) : filteredSegments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No customer segments assigned to this programme.
                  </td>
                </tr>
              ) : (
                filteredSegments.map((seg) => {
                  const selected = isSelected(seg.id)
                  return (
                    <tr
                      key={seg.id}
                      className={`transition-colors ${
                        selected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleRow(seg.id)}
                          aria-label={`Select segment ${seg.segment_code}`}
                        />
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs">
                          P{seg.priority}
                        </span>
                      </td>

                      {/* Segment Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {seg.segment_code}
                      </td>

                      {/* Segment Name */}
                      <td className="py-3.5 px-4 font-medium">
                        {seg.segment_name}
                      </td>

                      {/* Default Flag */}
                      <td className="py-3.5 px-4 text-center">
                        {seg.is_default ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            Default
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Charge Profile */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {seg.charge_profile_name}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={seg.active} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip content="Remove Segment Binding">
                              <button
                                onClick={() => handleRemoveSegment(seg.id, seg.segment_name)}
                                className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Segment Drawer Sheet */}
      <Sheet
        isOpen={isAssignSheetOpen}
        onClose={() => setIsAssignSheetOpen(false)}
        title="Assign Customer Segment"
        description={`Configure customer eligibility rules for '${programme.card_programme_name}'.`}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsAssignSheetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAssignSegment}>
              Assign Segment
            </Button>
          </>
        }
      >
        <form onSubmit={handleAssignSegment} className="space-y-4">
          <Input
            label="Segment Code"
            required
            value={segmentCode}
            onChange={(e) => setSegmentCode(e.target.value.toUpperCase())}
            helperText="Internal code for account eligibility matching."
          />

          <Input
            label="Segment Name"
            required
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            helperText="Descriptive name for branch officers."
          />

          <Input
            label="Priority Rank"
            type="number"
            required
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            helperText="Lower numbers indicate higher matching evaluation priority (P1, P2...)."
          />

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Set as Default Fallback Segment</span>
            </label>
          </div>
        </form>
      </Sheet>
    </div>
  )
}
