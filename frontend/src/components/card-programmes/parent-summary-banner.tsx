import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { CardProgramme } from '../../types'
import { StatusBadge } from '../ui/status-badge'
import { Button } from '../ui/button'
import { Edit2, ArrowLeft, Layers } from 'lucide-react'
import { Tooltip } from '../ui/tooltip'

export interface ParentSummaryBannerProps {
  programme: CardProgramme
  onEditParent?: () => void
  onBackToDetails?: () => void
  onBackToList?: () => void
  currentChildName?: string
}

export const ParentSummaryBanner: React.FC<ParentSummaryBannerProps> = ({
  programme,
  onEditParent,
  onBackToDetails,
  onBackToList,
  currentChildName,
}) => {
  const navigate = useNavigate()

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

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Section: Back Button + Main Information */}
        <div className="flex items-center gap-3">
          <Tooltip content="Back to Programme Details">
            <button
              onClick={handleBackToDetails}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Tooltip>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                {programme.card_programme_code}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                Brand: {programme.card_type}
              </span>
              <StatusBadge status={programme.active} />
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {programme.card_programme_name}
            </h2>
          </div>
        </div>

        {/* Middle Section: Attributes Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">BIN Prefix</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{programme.bin || '506118'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Platform</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{programme.platform_indicator || 'POSTILION_V2'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">PAN Length</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{programme.pan_length || 16} Digits</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Active Context</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{currentChildName || 'Child Management'}</span>
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip content="Edit parent card programme parameters">
            <Button variant="secondary" size="sm" onClick={handleEditParent} className="gap-1.5 text-xs">
              <Edit2 className="h-3.5 w-3.5" />
              Edit Parent
            </Button>
          </Tooltip>

          <Tooltip content="View all Card Programmes list">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <Layers className="h-3.5 w-3.5" />
              All Programmes
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

