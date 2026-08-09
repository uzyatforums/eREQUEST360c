import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Edit2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Trash2,
  ArrowLeft,
  Layers,
  Coins,
  Link2,
  History,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { CardProgramme, UserInfo } from '../../types'
import { apiService } from '../../services/api'
import { PageHeader } from '../../components/shared/page-header'
import { StatusBadge } from '../../components/ui/status-badge'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Breadcrumb } from '../../components/ui/breadcrumb'

export interface CardProgrammeDetailsProps {
  programme: CardProgramme
  currentUser: UserInfo
  onEdit?: () => void
  onToggleActive?: () => void
  onNavigateChild?: (childRoute: 'segments' | 'charges' | 'references' | 'audit') => void
  onBackToList?: () => void
}

export const CardProgrammeDetails: React.FC<CardProgrammeDetailsProps> = ({
  programme,
  currentUser,
  onEdit,
  onToggleActive,
  onNavigateChild,
  onBackToList,
}) => {
  const navigate = useNavigate()

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
  }, [currentUser.roles])

  const handleEdit = () => {
    if (onEdit) onEdit()
    navigate(`/card-programmes/${programme.id}/edit`)
  }

  const handleBackToList = () => {
    if (onBackToList) onBackToList()
    navigate('/card-programmes')
  }

  const handleChildNavigate = (child: 'segments' | 'charges' | 'references' | 'audit') => {
    if (onNavigateChild) onNavigateChild(child)
    navigate(`/card-programmes/${programme.id}/${child}`)
  }

  const parentFields = [
    { label: 'Programme Code', value: programme.card_programme_code, fontMono: true },
    { label: 'Programme Name', value: programme.card_programme_name },
    { label: 'Card Brand / Scheme', value: programme.card_type },
    { label: 'BIN Prefix', value: programme.bin || '506118', fontMono: true },
    { label: 'Sequence Number', value: `#${programme.sequence || programme.id}`, fontMono: true },
    { label: 'Platform Indicator', value: programme.platform_indicator || 'POSTILION_V2' },
    { label: 'PAN Length', value: `${programme.pan_length || 16} Digits` },
    { label: 'Min Random Number', value: programme.min_random_number || 100000, fontMono: true },
    { label: 'Max Random Number', value: programme.max_random_number || 999999, fontMono: true },
    { label: 'Output Export Path', value: programme.output_path || 'Not Configured (System Default)', fontMono: true },
    { label: 'Table Prefix', value: programme.table_prefix || 'TBL_CP_', fontMono: true },
    { label: 'FEP Programme ID', value: programme.fep_programme_id || `FEP_${programme.card_programme_code}`, fontMono: true },
    { label: 'Instant Card Type', value: programme.instant_card_type || 'INSTANT_STANDARD' },
    { label: 'Payment Ref Prefix', value: programme.payment_ref_prefix || 'PAY_REF_', fontMono: true },
    { label: 'Segment Group Binding', value: programme.assigned_segment_group || 'Retail Segment (01)' },
    { label: 'PP BIN Prefix', value: programme.pp_bin || '901234', fontMono: true },
    { label: 'Tenant Client ID', value: `Client #${programme.client_id}` },
    { label: 'Created By', value: programme.created_by || 'SYSTEM' },
    { label: 'Created Date', value: programme.created_date ? new Date(programme.created_date).toLocaleString() : 'N/A' },
    { label: 'Last Modified By', value: programme.last_modified_by || 'N/A' },
    { label: 'Last Modified Date', value: programme.last_modified_date ? new Date(programme.last_modified_date).toLocaleString() : 'N/A' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: handleBackToList },
          { label: 'Card Programmes', onClick: handleBackToList },
          { label: programme.card_programme_code },
        ]}
      />

      {/* Pending Change Banner */}
      {programme.has_pending_change && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Pending Approval Protection Active (Work Item #{programme.pending_work_item_id})
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                A {programme.pending_operation_code || 'configuration'} request is currently awaiting Checker review. Further mutations are disabled until approved or rejected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={handleBackToList}
              className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  {programme.card_programme_code}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                  Brand: {programme.card_type}
                </span>
                <StatusBadge status={programme.active} />
              </div>

              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {programme.card_programme_name}
              </h1>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {canManage && (
              <>
                {programme.has_pending_change ? (
                  <Tooltip content={`A pending change (Work Item #${programme.pending_work_item_id}) is awaiting approval`}>
                    <Button variant="primary" size="sm" disabled className="gap-1.5 text-xs opacity-50 cursor-not-allowed">
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Card Programme
                    </Button>
                  </Tooltip>
                ) : (
                  <Tooltip content="Edit Card Programme Specification">
                    <Button variant="primary" size="sm" onClick={handleEdit} className="gap-1.5 text-xs">
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Card Programme
                    </Button>
                  </Tooltip>
                )}

                {onToggleActive && (
                  programme.has_pending_change ? (
                    <Tooltip content={`A pending change (Work Item #${programme.pending_work_item_id}) is awaiting approval`}>
                      <Button variant="secondary" size="sm" disabled className="gap-1.5 text-xs opacity-50 cursor-not-allowed">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        Pending Approval
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip content={programme.active ? 'Deactivate Card Programme' : 'Activate Card Programme'}>
                      <Button variant="secondary" size="sm" onClick={onToggleActive} className="gap-1.5 text-xs">
                        {programme.active ? <ToggleLeft className="h-3.5 w-3.5 text-amber-600" /> : <ToggleRight className="h-3.5 w-3.5 text-emerald-600" />}
                        {programme.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </Tooltip>
                  )
                )}
              </>
            )}

            <Tooltip content="Return to Card Programmes List">
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1.5 text-xs">
                Back to List
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Child Entity Navigation Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
          Child Entity Management Workspaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Segments Card */}
          <div
            onClick={() => handleChildNavigate('segments')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                {programme.segment_count || 2} Segments
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-between">
              Customer Segments
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage eligibility rules, account segment bindings, and segment priorities.
            </p>
          </div>

          {/* Charges Card */}
          <div
            onClick={() => handleChildNavigate('charges')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                {programme.charge_header_count || 1} Profiles
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
              Charges & Posting
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage charge entries, fee amounts, posting accounts, and debit/credit rules.
            </p>
          </div>

          {/* References Card */}
          <div
            onClick={() => handleChildNavigate('references')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                <Link2 className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 rounded-full">
                Reference Data
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center justify-between">
              Reference Mappings
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View external host codes, mapping keys, and reference parameters.
            </p>
          </div>

          {/* Audit Card */}
          <div
            onClick={() => handleChildNavigate('audit')}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <History className="h-5 w-5" />
              </div>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-full">
                Audit Trail
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-between">
              Change History
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              View full maker-checker approval logs, audit timeline, and field modifications.
            </p>
          </div>
        </div>
      </div>

      {/* Parent Information Grid Card (ALL 20+ Banking Fields) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
            Complete Parent Attribute Specifications
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            21 Configured Banking Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
          {parentFields.map((field, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                {field.label}
              </span>
              <span className={`text-xs font-medium text-slate-900 dark:text-slate-100 block truncate ${field.fontMono ? 'font-mono' : ''}`}>
                {String(field.value ?? 'N/A')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

