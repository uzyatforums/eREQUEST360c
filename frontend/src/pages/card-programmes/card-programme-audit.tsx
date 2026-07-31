import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  RefreshCw,
} from 'lucide-react'
import { CardProgramme, AuditLogItem, UserInfo } from '../../types'
import { apiService } from '../../services/api'
import { ParentSummaryBanner } from '../../components/card-programmes/parent-summary-banner'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { Tooltip } from '../../components/ui/tooltip'
import { useToast } from '../../components/ui/toast'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { useRowSelection } from '../../hooks/use-row-selection'

export interface CardProgrammeAuditProps {
  programme: CardProgramme
  currentUser: UserInfo
  onBackToDetails?: () => void
  onBackToList?: () => void
  onEditParent?: () => void
}

export const CardProgrammeAudit: React.FC<CardProgrammeAuditProps> = ({
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

  const [logs, setLogs] = React.useState<AuditLogItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')

  const fetchAuditLogs = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammeAuditLogs(programme.id)
      setLogs(data)
    } catch {
      toast({
        title: 'Error Loading Audit Logs',
        description: 'Failed to retrieve change history audit logs.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [programme.id, toast])

  React.useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const filteredLogs = React.useMemo(() => {
    return logs.filter(
      (l) =>
        (l.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.field || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [logs, searchQuery])

  // Selection Hook
  const {
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<AuditLogItem>({
    items: filteredLogs,
    getKey: (l) => l.id,
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: handleBackToList },
          { label: 'Card Programmes', onClick: handleBackToList },
          { label: programme.card_programme_code, onClick: handleBackToDetails },
          { label: 'Audit' },
        ]}
      />

      {/* Parent Summary Banner */}
      <ParentSummaryBanner
        programme={programme}
        onEditParent={handleEditParent}
        onBackToDetails={handleBackToDetails}
        onBackToList={handleBackToList}
        currentChildName="Change Audit Trail & Maker-Checker History"
      />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search action, user or modified field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Refresh audit logs">
            <button
              onClick={fetchAuditLogs}
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
        totalCount={filteredLogs.length}
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
                    aria-label="Select all audit log entries"
                  />
                </th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Initiating User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Field Modified</th>
                <th className="py-3 px-4">Old Value</th>
                <th className="py-3 px-4">New Value</th>
                <th className="py-3 px-4 text-center">Maker</th>
                <th className="py-3 px-4 text-center">Checker</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Audit Logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No change audit history recorded for this card programme.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const selected = isSelected(log.id)
                  return (
                    <tr
                      key={log.id}
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
                          onChange={() => toggleRow(log.id)}
                          aria-label={`Select audit log ${log.id}`}
                        />
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {log.user}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </td>

                      {/* Field */}
                      <td className="py-3.5 px-4 font-medium">
                        {log.field}
                      </td>

                      {/* Old Value */}
                      <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-mono">
                        {log.oldValue || '—'}
                      </td>

                      {/* New Value */}
                      <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                        {log.newValue}
                      </td>

                      {/* Maker */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {log.maker || log.user}
                      </td>

                      {/* Checker */}
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {log.checker || 'AUTO_APPROVED'}
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
