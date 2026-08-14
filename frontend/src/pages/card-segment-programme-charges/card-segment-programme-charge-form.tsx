import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Coins, ArrowLeft, Save, RefreshCw } from 'lucide-react'
import { api } from '../../services/api'
import { CardSegmentProgrammeLookup } from '../../types'
import { useWorkQueue } from '../../context/work-queue-context'

export const CardSegmentProgrammeChargeForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const copyFromId = searchParams.get('copyFrom')

  const isEdit = Boolean(id)
  const { refreshPendingCount } = useWorkQueue()

  const [segmentProgrammes, setSegmentProgrammes] = useState<CardSegmentProgrammeLookup[]>([])
  const [chargeHeaders, setChargeHeaders] = useState<Array<{ id: number; charge_name: string; description?: string; active: boolean }>>([])
  const [processingModes, setProcessingModes] = useState<Array<{ processing_mode_code: string; processing_mode_name: string }>>([])

  const [cardSegmentProgrammeId, setCardSegmentProgrammeId] = useState<number | ''>('')
  const [chargeHeaderId, setChargeHeaderId] = useState<number | ''>('')
  const [processingModeCode, setProcessingModeCode] = useState<string>('NORMAL')
  const [priority, setPriority] = useState<number>(0)

  const [loading, setLoading] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [spLookups, chLookups, pmLookups] = await Promise.all([
        api.getSegmentProgrammeLookups(),
        api.getChargeHeaderLookups(),
        api.getProcessingModeLookups(),
      ])
      setSegmentProgrammes(spLookups)
      setChargeHeaders(chLookups)
      setProcessingModes(pmLookups)

      if (pmLookups.length > 0 && !processingModeCode) {
        setProcessingModeCode(pmLookups[0].processing_mode_code)
      }

      if (isEdit && id) {
        const detail = await api.getCardSegmentProgrammeChargeById(parseInt(id, 10))
        setCardSegmentProgrammeId(detail.card_segment_programme_id)
        setChargeHeaderId(detail.charge_header_id)
        setProcessingModeCode(detail.processing_mode_code)
        setPriority(detail.priority)
      } else if (copyFromId) {
        const source = await api.getCardSegmentProgrammeChargeById(parseInt(copyFromId, 10))
        setCardSegmentProgrammeId(source.card_segment_programme_id)
        setProcessingModeCode(source.processing_mode_code)
        setPriority(source.priority)
        setInfoMsg(`Pre-populated fields from Charge Mapping #${copyFromId}. Select Charge Header to complete.`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load form lookup dependencies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id, copyFromId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cardSegmentProgrammeId || !chargeHeaderId) {
      setError('Please select both a Card Segment Programme mapping and a Charge Header.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      let res
      if (isEdit && id) {
        res = await api.updateCardSegmentProgrammeCharge(parseInt(id, 10), {
          charge_header_id: Number(chargeHeaderId),
          priority: Number(priority),
          processing_mode_code: processingModeCode,
        })
      } else {
        res = await api.createCardSegmentProgrammeCharge({
          card_segment_programme_id: Number(cardSegmentProgrammeId),
          charge_header_id: Number(chargeHeaderId),
          priority: Number(priority),
          processing_mode_code: processingModeCode,
        })
      }

      if (res.status === 'PENDING_APPROVAL') {
        refreshPendingCount()
      }

      navigate('/card-segment-programme-charges')
    } catch (err: any) {
      setError(err.message || 'Failed to save Card Segment Programme Charge.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 max-w-3xl mx-auto">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading form...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => navigate('/card-segment-programme-charges')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-3"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Card Segment Programme Charges
        </button>

        <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-4">
          <Coins className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Charge Assignment' : copyFromId ? 'Copy Charge Assignment' : 'Assign New Charge Header'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Link a fee structure (Charge Header) to a Card Segment & Programme pair.
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {infoMsg && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
          {infoMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="space-y-4">
          {/* Card Segment Programme Pair Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Card Segment & Programme Mapping <span className="text-red-500">*</span>
            </label>
            <select
              disabled={isEdit}
              value={cardSegmentProgrammeId}
              onChange={(e) => setCardSegmentProgrammeId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">-- Select Segment & Programme --</option>
              {segmentProgrammes.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.segment_name} ({sp.segment_code}) → {sp.card_programme_name} ({sp.card_programme_code})
                </option>
              ))}
            </select>
          </div>

          {/* Charge Header Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
              Target Charge Header <span className="text-red-500">*</span>
            </label>
            <select
              value={chargeHeaderId}
              onChange={(e) => setChargeHeaderId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Charge Header --</option>
              {chargeHeaders.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.charge_name} {ch.description ? `- ${ch.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Processing Mode Code & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                Processing Mode Code <span className="text-red-500">*</span>
              </label>
              <select
                value={processingModeCode}
                onChange={(e) => setProcessingModeCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {processingModes.map((pm) => (
                  <option key={pm.processing_mode_code} value={pm.processing_mode_code}>
                    {pm.processing_mode_name} ({pm.processing_mode_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-1.5">
                Priority Sequence
              </label>
              <input
                type="number"
                min="0"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => navigate('/card-segment-programme-charges')}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}
