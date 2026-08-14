import * as React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Coins,
  Edit2,
  Copy,
  ExternalLink,
  ShieldAlert,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { api } from '../../services/api'
import { CardChargesHeader } from '../../types'

export const CardChargeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [header, setHeader] = React.useState<CardChargesHeader | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    const fetchDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getCardChargeById(Number(id))
        setHeader(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to load card charge profile.')
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [id])

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading card charge details...
      </div>
    )
  }

  if (error || !header) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/card-charges')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Card Charges Master
        </button>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          {error || 'Card Charge Profile not found.'}
        </div>
      </div>
    )
  }

  // Calculate totals
  const totalDebits = header.entries
    .filter((e) => e.active && e.dr_cr === 'D')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalCredits = header.entries
    .filter((e) => e.active && e.dr_cr === 'C')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/card-charges')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Card Charges Master
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/card-charges/new?copyFrom=${header.id}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-sm rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy Profile
          </button>

          <button
            onClick={() => navigate(`/card-charges/${header.id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Pending Approval Governance Banner */}
      {header.has_pending_change && header.pending_work_item_id && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Pending Governance Review
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This Card Charge Profile has a pending {header.pending_operation_code || 'UPDATE'} request waiting in the Maker/Checker queue.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/maker-checker?focus=${header.pending_work_item_id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            <span>Review Request</span>
            <span className="font-mono">MC-{String(header.pending_work_item_id).padStart(8, '0')}</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      )}

      {/* Header Info Panel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {header.charge_name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {header.description || 'No description provided.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
              {header.effective_currency || 'NGN'}
            </span>

            {header.active ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Accounting Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Active Debits</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {header.effective_currency} {totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Active Credits</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {header.effective_currency} {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Difference</span>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
              {header.effective_currency} {Math.abs(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Accounting Balance</span>
            <div className="mt-1">
              {isBalanced ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> Balanced (0.00)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" /> Unbalanced
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charge Entry Lines Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4 p-6">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Accounting Posting Entry Lines ({header.entries.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
              <tr>
                <th className="py-3 px-3 w-12 text-center">Seq</th>
                <th className="py-3 px-3">Entry Type</th>
                <th className="py-3 px-3 text-center">Dr / Cr</th>
                <th className="py-3 px-3">Narration</th>
                <th className="py-3 px-3">Account Number</th>
                <th className="py-3 px-3">Branch Type</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
              {header.entries.map((entry, idx) => (
                <tr key={entry.id || idx} className={!entry.active ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/20' : ''}>
                  <td className="py-3 px-3 text-center font-mono text-slate-400">
                    {entry.sequence_no}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                    {entry.posting_entry_type}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold">
                    {entry.dr_cr === 'D' ? (
                      <span className="text-indigo-600 dark:text-indigo-400">D (Debit)</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400">C (Credit)</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                    {entry.narration}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                    {entry.posting_account_number || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                    {entry.posting_branch_type || '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold">
                    {entry.currency_code} {Number(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {entry.active ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                        Soft-Retired
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
