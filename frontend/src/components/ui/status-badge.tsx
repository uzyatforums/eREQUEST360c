import * as React from 'react'
import { cn } from '../../lib/utils'
import { StatusType } from '../../types'
import { Check, MinusCircle, Clock, AlertCircle, ShieldAlert, CheckCircle2, CheckCheck, XCircle, Flame, AlertTriangle } from 'lucide-react'

interface StatusBadgeProps {
  status: StatusType | boolean
  label?: string
  showIcon?: boolean
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, showIcon = true, className }) => {
  // Normalize boolean active status
  const statusKey: StatusType = typeof status === 'boolean' ? (status ? 'ACTIVE' : 'INACTIVE') : status

  const getStatusConfig = (key: StatusType) => {
    switch (key) {
      case 'ACTIVE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Check,
          text: label || 'Active',
        }
      case 'INACTIVE':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-300',
          icon: MinusCircle,
          text: label || 'Inactive',
        }
      case 'PENDING':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: Clock,
          text: label || 'Pending Approval',
        }
      case 'PENDING_APPROVAL':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: AlertCircle,
          text: label || 'Pending Approval',
        }
      case 'PENDING_AUTHORIZATION':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: ShieldAlert,
          text: label || 'Pending Authorization',
        }
      case 'APPROVED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          text: label || 'Approved',
        }
      case 'COMPLETED':
        return {
          bg: 'bg-green-100 text-green-800 border-green-300',
          icon: CheckCheck,
          text: label || 'Completed',
        }
      case 'REJECTED':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          icon: XCircle,
          text: label || 'Rejected',
        }
      case 'HOTLISTED':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          icon: Flame,
          text: label || 'Hotlisted',
        }
      case 'SETTLEMENT_FAILED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          icon: AlertTriangle,
          text: label || 'Settlement Failed',
        }
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Clock,
          text: label || String(statusKey),
        }
    }
  }

  const config = getStatusConfig(statusKey)
  const IconComponent = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border shadow-2xs transition-colors',
        config.bg,
        className
      )}
    >
      {showIcon && <IconComponent className="h-3 w-3 shrink-0" />}
      <span>{config.text}</span>
    </span>
  )
}
