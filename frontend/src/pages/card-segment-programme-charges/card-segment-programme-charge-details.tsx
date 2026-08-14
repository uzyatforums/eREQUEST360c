import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Coins,
  ArrowLeft,
  Edit,
  Copy,
  Power,
  ExternalLink,
  Layers,
  CreditCard,
  Receipt,
  RefreshCw,
} from 'lucide-react'
import { api } from '../../services/api'
import { CardSegmentProgrammeChargeDetail } from '../../types'

export const CardSegmentProgrammeChargeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<CardSegmentProgrammeChargeDetail | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const loadDetail = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getCardSegmentProgrammeChargeById(parseInt(id, 10))
      setDetail(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load charge mapping details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [id])

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 max-w-5xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading details...
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <button
          onClick={() => navigate('/card-segment-programme-charges')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Master List
        </button>
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg">
          {error || 'Record not found.'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => navigate('/card-segment-programme-charges')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Card Segment Programme Charges
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Coins className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {detail.segment_name} — {detail.card_programme_name}
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono">
              Segment: {detail.segment_code} | Programme: {detail.card_programme_code} | Mode: {detail.processing_mode_code}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/card-segment-programme-charges/${detail.id}/edit`)}
              className="inline-flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition-colors"
            >
              <Edit className="w-4 h-4 mr-1.5" /> Edit Mapping
            </button>
            <button
              onClick={() => navigate(`/card-segment-programme-charges/new?copyFrom=${detail.id}`)}
              className="inline-flex items-center px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
            >
              <Copy className="w-4 h-4 mr-1.5" /> Copy
            </button>
          </div>
        </div>
      </div>

      {/* Pending Banner if applicable */}
      {detail.has_pending_change && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Governance Action Pending:</span>
            <span className="text-sm">This record has a pending Maker/Checker request.</span>
          </div>
          {detail.pending_work_item_id && (
            <button
              onClick={() => navigate(`/maker-checker?workItemId=${detail.pending_work_item_id}`)}
              className="inline-flex items-center gap-1 text-sm font-mono font-medium underline text-amber-900 dark:text-amber-100 hover:opacity-80"
            >
              Review ({detail.pending_work_item_id})
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Detail Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Segment Info */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <Layers className="w-4 h-4" /> Card Segment
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {detail.segment_name}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              Code: {detail.segment_code}
            </div>
          </div>
        </div>

        {/* Card Programme Info */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <CreditCard className="w-4 h-4" /> Card Programme
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {detail.card_programme_name}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              Code: {detail.card_programme_code} {detail.card_brand ? `| Brand: ${detail.card_brand}` : ''}
            </div>
          </div>
        </div>

        {/* Charge Header & Mode */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <Receipt className="w-4 h-4" /> Charge Structure
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {detail.charge_name}
            </div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">
              Mode: {detail.processing_mode_code} | Priority: {detail.priority}
            </div>
          </div>
        </div>
      </div>

      {/* Charge Entries Detail Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Linked Charge Header Breakdown ({detail.entries.length} Entries)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-3">Seq</th>
                <th className="px-4 py-3">Account Type</th>
                <th className="px-4 py-3">DR / CR</th>
                <th className="px-4 py-3">Posting Entry Type</th>
                <th className="px-4 py-3">Narration</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Currency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {detail.entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500 text-sm">
                    No charge entries defined under this Charge Header.
                  </td>
                </tr>
              ) : (
                detail.entries.map((entry) => (
                  <tr key={entry.id || entry.sequence_no} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-300">{entry.sequence_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{entry.posting_account_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          entry.dr_cr === 'D'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        }`}
                      >
                        {entry.dr_cr === 'D' ? 'DEBIT (D)' : 'CREDIT (C)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{entry.posting_entry_type}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{entry.narration}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                      {entry.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">{entry.currency_code}</td>
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
