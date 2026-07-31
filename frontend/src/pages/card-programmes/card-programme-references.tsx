import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Link2,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { CardProgramme, ProgrammeReferenceItem, UserInfo } from '../../types'
import { apiService } from '../../services/api'
import { ParentSummaryBanner } from '../../components/card-programmes/parent-summary-banner'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { StatusBadge } from '../../components/ui/status-badge'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { useToast } from '../../components/ui/toast'

export interface CardProgrammeReferencesProps {
  programme: CardProgramme
  currentUser: UserInfo
  onBackToDetails?: () => void
  onBackToList?: () => void
  onEditParent?: () => void
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

  const [references, setReferences] = React.useState<ProgrammeReferenceItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')

  const fetchReferences = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammeReferences(programme.id)
      setReferences(data)
    } catch {
      toast({
        title: 'Error Loading References',
        description: 'Failed to retrieve card programme reference mappings.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [programme.id, toast])

  React.useEffect(() => {
    fetchReferences()
  }, [fetchReferences])

  const filteredReferences = React.useMemo(() => {
    return references.filter(
      (r) =>
        r.reference_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reference_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [references, searchQuery])

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
        currentChildName="Reference Data Mappings"
      />


      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search reference code or description..."
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

      {/* Full-Width Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Reference Code</th>
                <th className="py-3 px-4">Reference Description</th>
                <th className="py-3 px-4 text-center">Mapped Items</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Reference Data Mappings...
                  </td>
                </tr>
              ) : filteredReferences.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No reference data mappings configured for this programme.
                  </td>
                </tr>
              ) : (
                filteredReferences.map((ref) => (
                  <tr key={ref.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Reference Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {ref.reference_code}
                    </td>

                    {/* Reference Name */}
                    <td className="py-3.5 px-4 font-medium">
                      {ref.reference_name}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
