import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Filter,
  CreditCard,
  Layers,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import { CardProgramme, UserInfo, CardType } from '../../types'
import { apiService } from '../../services/api'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/ui/status-badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Tooltip } from '../../components/ui/tooltip'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { useToast } from '../../components/ui/toast'

export interface CardProgrammesListProps {
  currentUser: UserInfo
  cardProgrammes: CardProgramme[]
  cardTypes: CardType[]
  isLoading: boolean
  onRefresh: () => void
  onViewDetails?: (id: number) => void
  onEditProgramme?: (prog: CardProgramme) => void
  onDeleteProgramme?: (prog: CardProgramme) => void
  onCreateProgramme?: () => void
}

export const CardProgrammesList: React.FC<CardProgrammesListProps> = ({
  currentUser,
  cardProgrammes,
  cardTypes,
  isLoading,
  onRefresh,
  onViewDetails,
  onEditProgramme,
  onDeleteProgramme,
  onCreateProgramme,
}) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [brandFilter, setBrandFilter] = React.useState('ALL')
  const [statusFilter, setStatusFilter] = React.useState('ALL')

  const handleCreate = () => {
    if (onCreateProgramme) onCreateProgramme()
    navigate('/card-programmes/new')
  }

  const handleViewDetails = (id: number) => {
    if (onViewDetails) onViewDetails(id)
    navigate(`/card-programmes/${id}`)
  }

  const handleEdit = (prog: CardProgramme) => {
    if (onEditProgramme) onEditProgramme(prog)
    navigate(`/card-programmes/${prog.id}/edit`)
  }

  // Filter programmes
  const filteredProgrammes = React.useMemo(() => {
    return cardProgrammes.filter((p) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        p.card_programme_code.toLowerCase().includes(q) ||
        p.card_programme_name.toLowerCase().includes(q) ||
        p.card_type.toLowerCase().includes(q)
      const matchesBrand = brandFilter === 'ALL' || p.card_type === brandFilter
      const matchesStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? p.active : !p.active)

      return matchesSearch && matchesBrand && matchesStatus
    })
  }, [cardProgrammes, searchQuery, brandFilter, statusFilter])

  const canManage = currentUser.roles.some((r) =>
    ['super_admin', 'operations_admin_maker', 'operations_admin_checker'].includes(r)
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: () => navigate('/card-programmes') },
          { label: 'Card Programmes', onClick: () => navigate('/card-programmes') },
        ]}
      />

      {/* Page Header */}
      <PageHeader
        title="Card Programmes Master"
        description="Manage payment card product specifications, customer segment bindings, fee profiles, and issuance policies across the institution."
        actions={
          canManage ? (
            <Button variant="primary" onClick={handleCreate} className="gap-2 text-xs">
              <Plus className="h-4 w-4" />
              New Card Programme
            </Button>
          ) : undefined
        }
      />

      {/* Toolbar: Search, Filters, Refresh */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, name, or card brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:text-slate-100"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All Card Brands</option>
              {cardTypes.map((ct) => (
                <option key={ct.card_type} value={ct.card_type}>
                  {ct.description || ct.card_type} ({ct.card_type})
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          <Tooltip content="Refresh card programmes list">
            <button
              onClick={onRefresh}
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
                <th className="py-3 px-4">Programme Code</th>
                <th className="py-3 px-4">Programme Name</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">BIN</th>
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4 text-center">PAN Length</th>
                <th className="py-3 px-4 text-center">Seq</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Segments</th>
                <th className="py-3 px-4 text-center">Charges</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Last Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading Card Programmes...
                  </td>
                </tr>
              ) : filteredProgrammes.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No Card Programmes match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProgrammes.map((prog) => (
                  <tr
                    key={prog.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleViewDetails(prog.id)}
                  >
                    {/* Programme Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {prog.card_programme_code}
                    </td>

                    {/* Programme Name */}
                    <td className="py-3.5 px-4 font-semibold max-w-[200px] truncate">
                      {prog.card_programme_name}
                    </td>

                    {/* Brand */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                        {prog.card_type}
                      </span>
                    </td>

                    {/* BIN */}
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {prog.bin || '506118'}
                    </td>

                    {/* Platform Indicator */}
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {prog.platform_indicator || 'POSTILION_V2'}
                    </td>

                    {/* PAN Length */}
                    <td className="py-3.5 px-4 text-center font-mono">
                      {prog.pan_length || 16}
                    </td>

                    {/* Sequence */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                      #{prog.sequence || prog.id}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={prog.active} />
                    </td>

                    {/* Segments Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold text-[11px]">
                        {prog.segment_count || 2}
                      </span>
                    </td>

                    {/* Charges Count */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-[11px]">
                        {prog.charge_header_count || 1}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {prog.created_date ? new Date(prog.created_date).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Last Modified */}
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {prog.last_modified_date ? new Date(prog.last_modified_date).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="View Programme Details">
                          <button
                            onClick={() => handleViewDetails(prog.id)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </Tooltip>

                        {canManage && (
                          <Tooltip content="Edit Card Programme">
                            <button
                              onClick={() => handleEdit(prog)}
                              className="p-1.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
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
    </div>
  )
}

