import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { CardProgramme, ProgrammeReferenceItem, UserInfo } from '../../types'
import { apiService } from '../../services/api'
import { ParentSummaryBanner } from '../../components/card-programmes/parent-summary-banner'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { StatusBadge } from '../../components/ui/status-badge'
import { Tooltip } from '../../components/ui/tooltip'
import { useToast } from '../../components/ui/toast'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { SortableHeader, SortOrder } from '../../components/ui/sortable-header'
import { useRowSelection } from '../../hooks/use-row-selection'

export interface CardProgrammeReferencesProps {
  programme: CardProgramme
  currentUser: UserInfo
  onBackToDetails?: () => void
  onBackToList?: () => void
  onEditParent?: () => void
}

export interface EnhancedReferenceMapping extends ProgrammeReferenceItem {
  target_system: string
  core_banking_code: string
  switch_product_id: string
  network_scheme_code: string
}

export const CardProgrammeReferences: React.FC<CardProgrammeReferencesProps> = ({
  programme,
  currentUser,
  onBackToDetails,
  onBackToList,
  onEditParent,
}) => {
  const navigate = useNavigate()
  const { toast } = useToast()

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

  const [references, setReferences] = React.useState<EnhancedReferenceMapping[]>([
    {
      id: 1,
      category: 'Eligibility Rules',
      reference_code: 'REF_CORE_FLEXCUBE',
      reference_name: 'Oracle Flexcube Core Banking Product Mapping',
      target_system: 'FLEXCUBE_V12',
      core_banking_code: `FLX_PRD_${programme.card_programme_code}`,
      switch_product_id: 'SW_POST_506',
      network_scheme_code: 'SCHEME_VERVE_01',
      item_count: 4,
      status: 'ACTIVE',
    },
    {
      id: 2,
      category: 'Request Types',
      reference_code: 'REF_SWITCH_POSTILION',
      reference_name: 'Postilion Card Management Host Profile',
      target_system: 'POSTILION_HOST',
      core_banking_code: 'FLX_ACC_3002',
      switch_product_id: 'PRD_POST_VERVE',
      network_scheme_code: 'ISW_VRV_NGN',
      item_count: 8,
      status: 'ACTIVE',
    },
    {
      id: 3,
      category: 'Card Requests',
      reference_code: 'REF_TAX_FIRS',
      reference_name: 'FIRS VAT Tax Posting Ledger Mapping',
      target_system: 'FIRS_TAX_ENGINE',
      core_banking_code: 'GL_2001928374',
      switch_product_id: 'TAX_VAT_75',
      network_scheme_code: 'NGR_VAT_RULE',
      item_count: 2,
      status: 'ACTIVE',
    },
  ])

  const [isLoading, setIsLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  // Sorting State
  const [sortField, setSortField] = React.useState<string | null>('reference_code')
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

  const fetchReferences = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammeReferences(programme.id)
      if (data && data.length > 0) {
        const enhanced: EnhancedReferenceMapping[] = data.map((r, idx) => ({
          ...r,
          target_system: idx % 2 === 0 ? 'FLEXCUBE_V12' : 'POSTILION_HOST',
          core_banking_code: `FLX_${r.reference_code}`,
          switch_product_id: `SW_${r.id}_PRD`,
          network_scheme_code: `SCHEME_${programme.card_type}`,
        }))
        setReferences(enhanced)
      }
    } catch {
      toast({
        title: 'Error Loading References',
        description: 'Failed to retrieve card programme reference mappings.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [programme.id, programme.card_type, toast])

  React.useEffect(() => {
    fetchReferences()
  }, [fetchReferences])

  const filteredReferences = React.useMemo(() => {
    const list = references.filter(
      (r) =>
        r.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reference_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.target_system.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [references, searchQuery, sortField, sortOrder])

  // Selection Hook
  const {
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<EnhancedReferenceMapping>({
    items: filteredReferences,
    getKey: (r) => r.id,
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: handleBackToList },
          { label: 'Card Programmes', onClick: handleBackToList },
          { label: programme.card_programme_code, onClick: handleBackToDetails },
          { label: 'References' },
        ]}
      />

      {/* Parent Summary Banner */}
      <ParentSummaryBanner
        programme={programme}
        onEditParent={handleEditParent}
        onBackToDetails={handleBackToDetails}
        onBackToList={handleBackToList}
        currentChildName="Reference Data & Integration Mappings"
      />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference code, system or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Refresh reference mappings">
            <button
              onClick={fetchReferences}
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
        totalCount={filteredReferences.length}
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
                    aria-label="Select all references"
                  />
                </th>
                <th className="py-3 px-4">
                  <SortableHeader
                    label="Reference Code"
                    sortField="reference_code"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4">
                  <SortableHeader
                    label="Reference Description"
                    sortField="reference_name"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4">
                  <SortableHeader
                    label="Target Integration System"
                    sortField="target_system"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4 font-mono">Core Banking Code</th>
                <th className="py-3 px-4 font-mono">Switch Product ID</th>
                <th className="py-3 px-4 font-mono">Scheme Code</th>
                <th className="py-3 px-4 text-center">
                  <SortableHeader
                    label="Mapped Items"
                    sortField="item_count"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-3 px-4 text-center">
                  <SortableHeader
                    label="Status"
                    sortField="status"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Reference Data Mappings...
                  </td>
                </tr>
              ) : filteredReferences.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No reference data mappings configured for this programme.
                  </td>
                </tr>
              ) : (
                filteredReferences.map((ref) => {
                  const selected = isSelected(ref.id)
                  return (
                    <tr
                      key={ref.id}
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
                          onChange={() => toggleRow(ref.id)}
                          aria-label={`Select reference ${ref.reference_code}`}
                        />
                      </td>

                      {/* Reference Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {ref.reference_code}
                      </td>

                      {/* Reference Name */}
                      <td className="py-3.5 px-4 font-medium max-w-[220px] truncate">
                        {ref.reference_name}
                      </td>

                      {/* Target System */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          {ref.target_system}
                        </span>
                      </td>

                      {/* Core Banking Code */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {ref.core_banking_code}
                      </td>

                      {/* Switch Product ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {ref.switch_product_id}
                      </td>

                      {/* Network Scheme Code */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {ref.network_scheme_code}
                      </td>

                      {/* Mapped Items */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 font-semibold text-[11px] bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800">
                          {ref.item_count || 2} Items Mapped
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={ref.status === 'ACTIVE' || ref.status === 'Active'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Tooltip content="View Reference Details">
                          <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
