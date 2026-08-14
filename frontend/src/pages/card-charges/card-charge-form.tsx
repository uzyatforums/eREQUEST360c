import * as React from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Save,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Copy,
} from 'lucide-react'
import { api } from '../../services/api'
import {
  CardChargesHeader,
  CardChargeEntry,
  PostingBranchType,
  PostingEntryType,
} from '../../types'
import { useToast } from '../../components/ui/toast'
import { useWorkQueue } from '../../context/work-queue-context'

export const CardChargeForm: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const copyFromId = searchParams.get('copyFrom')

  const navigate = useNavigate()
  const { toast } = useToast()
  const { refreshPendingCount } = useWorkQueue()

  const isEdit = Boolean(id)
  const isCopy = Boolean(copyFromId)

  // Form State
  const [chargeName, setChargeName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [active, setActive] = React.useState(true)
  const [currencyCode, setCurrencyCode] = React.useState('NGN')
  const [entries, setEntries] = React.useState<CardChargeEntry[]>([])

  const initialBaselineRef = React.useRef<{
    chargeName: string
    description: string
    active: boolean
    currencyCode: string
    entries: any[]
  } | null>(null)

  // Lookups
  const [branchTypes, setBranchTypes] = React.useState<PostingBranchType[]>([])
  const [entryTypes, setEntryTypes] = React.useState<PostingEntryType[]>([])

  // Status
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Load Lookups and initial data
  React.useEffect(() => {
    const initData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [btData, etData] = await Promise.all([
          api.getPostingBranchTypes(),
          api.getPostingEntryTypes(),
        ])
        setBranchTypes(btData)
        setEntryTypes(etData)

        let loadedName = ''
        let loadedDesc = ''
        let loadedActive = true
        let loadedCurr = 'NGN'
        let loadedEntries: CardChargeEntry[] = []

        if (isEdit && id) {
          // Load Edit target
          const header = await api.getCardChargeById(Number(id))
          loadedName = header.charge_name
          loadedDesc = header.description || ''
          loadedActive = header.active
          loadedCurr = header.effective_currency || 'NGN'
          loadedEntries = header.entries || []
        } else if (isCopy && copyFromId) {
          // Load Copy source (only effective entries: Header active & Entry active)
          const source = await api.getCardChargeById(Number(copyFromId))
          loadedName = `${source.charge_name} (Copy)`
          loadedDesc = source.description ? `Copy of ${source.description}` : `Copied from ${source.charge_name}`
          loadedActive = true
          loadedCurr = source.effective_currency || 'NGN'

          const effectiveEntries = (source.entries || [])
            .filter((e: CardChargeEntry) => source.active && e.active)
            .map((e: CardChargeEntry, idx: number) => ({
              sequence_no: idx + 1,
              posting_account_type: e.posting_account_type || 'GL',
              dr_cr: e.dr_cr || 'D',
              narration: e.narration,
              posting_account_number: e.posting_account_number || '',
              posting_branch_type: e.posting_branch_type || '',
              posting_entry_type: e.posting_entry_type,
              amount: e.amount,
              currency_code: e.currency_code || 'NGN',
              active: true,
            }))

          loadedEntries = effectiveEntries.length > 0
            ? effectiveEntries
            : [
                { sequence_no: 1, posting_account_type: 'GL', dr_cr: 'D', narration: 'CARD ISSUANCE', posting_entry_type: 'CISSUANCE', amount: 1000, currency_code: 'NGN', active: true },
                { sequence_no: 2, posting_account_type: 'GL', dr_cr: 'C', narration: 'CARD ISSUANCE INCOME', posting_entry_type: 'GINC', amount: 1000, currency_code: 'NGN', active: true },
              ]
        } else {
          // Default new form with 2 balanced entry lines
          loadedEntries = [
            { sequence_no: 1, posting_account_type: 'GL', dr_cr: 'D', narration: 'CARD ISSUANCE', posting_entry_type: 'CISSUANCE', amount: 1000, currency_code: 'NGN', active: true },
            { sequence_no: 2, posting_account_type: 'GL', dr_cr: 'C', narration: 'CARD ISSUANCE INCOME', posting_entry_type: 'GINC', amount: 1000, currency_code: 'NGN', active: true },
          ]
        }

        setChargeName(loadedName)
        setDescription(loadedDesc)
        setActive(loadedActive)
        setCurrencyCode(loadedCurr)
        setEntries(loadedEntries)

        initialBaselineRef.current = {
          chargeName: loadedName.trim(),
          description: loadedDesc.trim(),
          active: loadedActive,
          currencyCode: loadedCurr,
          entries: loadedEntries.map((e) => ({
            id: e.id,
            sequence_no: e.sequence_no,
            posting_account_type: e.posting_account_type || 'GL',
            dr_cr: e.dr_cr || 'D',
            narration: (e.narration || '').trim(),
            posting_account_number: (e.posting_account_number || '').trim(),
            posting_branch_type: (e.posting_branch_type || '').trim(),
            posting_entry_type: (e.posting_entry_type || '').trim(),
            amount: Number(e.amount),
            currency_code: e.currency_code || loadedCurr,
            active: e.active,
          })),
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to initialize form data.')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [id, copyFromId, isEdit, isCopy])

  // Real-time Balance Calculation
  const totalDebits = entries
    .filter((e) => e.active && e.dr_cr === 'D')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const totalCredits = entries
    .filter((e) => e.active && e.dr_cr === 'C')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const difference = Math.abs(totalDebits - totalCredits)
  const isBalanced = difference < 0.01

  // Handle Entry updates
  const updateEntryField = (index: number, field: keyof CardChargeEntry, value: any) => {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'currency_code') {
        setCurrencyCode(value)
        next.forEach((e) => (e.currency_code = value))
      }
      return next
    })
  }

  // Requirement 4: Genuinely new blank entry line (not copying line 1)
  const addEntryLine = () => {
    const assignedTypes = new Set(entries.filter((e) => e.active).map((e) => e.posting_entry_type))
    const available = entryTypes.find((et) => !assignedTypes.has(et.posting_entry_type))
    const defaultType = available ? available.posting_entry_type : (entryTypes[0]?.posting_entry_type || '')

    setEntries((prev) => [
      ...prev,
      {
        sequence_no: prev.length + 1,
        posting_account_type: 'GL',
        dr_cr: 'D',
        narration: '',
        posting_account_number: '',
        posting_branch_type: 'RB',
        posting_entry_type: defaultType,
        amount: 0,
        currency_code: currencyCode,
        active: true,
      },
    ])
  }

  // Requirement 3: Entry-level Copy
  const copyEntryLine = (index: number) => {
    const source = entries[index]
    const assignedTypes = new Set(entries.filter((e) => e.active).map((e) => e.posting_entry_type))
    const available = entryTypes.find((et) => !assignedTypes.has(et.posting_entry_type))
    const defaultType = available ? available.posting_entry_type : ''

    const newEntry: CardChargeEntry = {
      sequence_no: entries.length + 1,
      posting_account_type: source.posting_account_type || 'GL',
      dr_cr: source.dr_cr || 'D',
      narration: source.narration ? `${source.narration} (Copy)` : '',
      posting_account_number: source.posting_account_number || '',
      posting_branch_type: source.posting_branch_type || 'RB',
      posting_entry_type: defaultType,
      amount: source.amount || 0,
      currency_code: currencyCode,
      active: true,
    }
    setEntries((prev) => [...prev, newEntry])
  }

  const toggleRetireEntryLine = (index: number) => {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], active: !next[index].active }
      return next
    })
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)

    if (!chargeName || !chargeName.trim()) {
      setError('Charge Header Name is required.')
      return
    }

    if (entries.length === 0) {
      setError('At least one Charge Entry line is required.')
      return
    }

    // Check entry required fields
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.active) {
        if (!entry.narration || !entry.narration.trim()) {
          setError(`Line ${i + 1}: Narration is required.`)
          return
        }
        if (!entry.posting_entry_type) {
          setError(`Line ${i + 1}: Entry Type is required.`)
          return
        }
      }
    }

    // Requirement 5: Unique posting_entry_type validation
    const activeEntryTypes = entries.filter((e) => e.active).map((e) => e.posting_entry_type.trim())
    const uniqueEntryTypes = new Set(activeEntryTypes)
    if (activeEntryTypes.length !== uniqueEntryTypes.size) {
      setError('Duplicate entry type is not allowed in the same Charge Profile. Each active line must have a unique Entry Type.')
      return
    }

    // Check balance
    if (!isBalanced) {
      setError(`Cannot submit unbalanced configuration. Debits (${totalDebits.toFixed(2)}) must equal Credits (${totalCredits.toFixed(2)}). Difference: ${difference.toFixed(2)}.`)
      return
    }

    const formattedEntries = entries.map((entry, idx) => ({
      id: entry.id,
      sequence_no: idx + 1,
      posting_account_type: entry.posting_account_type || 'GL',
      dr_cr: entry.dr_cr || 'D',
      narration: entry.narration.trim(),
      posting_account_number: entry.posting_account_number ? entry.posting_account_number.trim() : null,
      posting_branch_type: entry.posting_branch_type ? entry.posting_branch_type.trim() : null,
      posting_entry_type: entry.posting_entry_type.trim(),
      amount: Number(entry.amount),
      currency_code: currencyCode,
      active: entry.active,
    }))

    const payload = {
      charge_name: chargeName.trim(),
      description: description.trim() || null,
      active: active,
      entries: formattedEntries,
    }

    // Requirement 8: No-Change Edit Protection
    if (isEdit && initialBaselineRef.current) {
      const b = initialBaselineRef.current
      const currentPayloadForCheck = {
        charge_name: payload.charge_name,
        description: payload.description || '',
        active: payload.active,
        currency_code: currencyCode,
        entries: formattedEntries.map((e) => ({
          id: e.id,
          sequence_no: e.sequence_no,
          posting_account_type: e.posting_account_type,
          dr_cr: e.dr_cr,
          narration: e.narration,
          posting_account_number: e.posting_account_number || '',
          posting_branch_type: e.posting_branch_type || '',
          posting_entry_type: e.posting_entry_type,
          amount: e.amount,
          currency_code: e.currency_code,
          active: e.active,
        })),
      }

      if (JSON.stringify(b) === JSON.stringify(currentPayloadForCheck)) {
        setError('No changes detected. Nothing to submit for approval.')
        toast({
          title: 'No Changes Detected',
          description: 'No changes detected. Nothing to submit for approval.',
        })
        return
      }
    }

    setSubmitting(true)

    try {
      let res: any
      if (isEdit && id) {
        res = await api.updateCardCharge(Number(id), payload)
      } else {
        res = await api.createCardCharge(payload)
      }

      // Requirement 7: Submission Toast Notification with actual Work Item ID / Work Item Number
      const wiNo = res.work_item_number || (res.work_item_id ? `MC-${String(res.work_item_id).padStart(8, '0')}` : null)
      const msg = wiNo
        ? `Submitted for Maker/Checker Approval. Work Item: ${wiNo}`
        : (res.message || 'Charge Profile change submitted for Maker/Checker approval.')

      setSuccessMsg(msg)
      toast({
        title: 'Submitted for Approval',
        description: msg,
      })

      // Requirement 10: Immediately synchronize pending count
      refreshPendingCount()

      setTimeout(() => {
        navigate('/card-charges')
      }, 1500)
    } catch (err: any) {
      setError(err?.message || 'Failed to submit Card Charge Profile.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading form...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Navigation Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/card-charges')}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Card Charges Master
        </button>
      </div>

      {/* Header Info */}
      <div>
        <div className="flex items-center gap-2">
          <Coins className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit Card Charge Profile' : isCopy ? 'Copy Card Charge Profile' : 'Create Card Charge Profile'}
          </h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isEdit
            ? 'Modify accounting template metadata and posting entry lines. Changes require Maker/Checker approval.'
            : isCopy
            ? 'Create a new charge profile by copying effective entries from the source template.'
            : 'Define a new financial posting profile with balanced debit and credit entries.'}
        </p>
      </div>

      {/* Error & Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Metadata Section */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-3">
            Header Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Charge Header Name */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Charge Profile Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={chargeName}
                onChange={(e) => setChargeName(e.target.value)}
                placeholder="e.g. Verve Classic Card Charges"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>

            {/* Template Currency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Currency Code (ISO)
              </label>
              <select
                value={currencyCode}
                onChange={(e) => updateEntryField(0, 'currency_code', e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-mono"
              >
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
              </select>
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional template description"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>

            {/* Active Toggle */}
            <div className="space-y-1.5 flex flex-col justify-center">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Header Status
              </label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActive(!active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    active ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {active ? 'Active Profile' : 'Inactive Profile'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Accounting Balance Panel (Rule 4) */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isBalanced
            ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-800'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              )}
              <div>
                <h4 className={`text-sm font-bold ${isBalanced ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'}`}>
                  {isBalanced ? 'Accounting Balance Status: Balanced (0.00)' : `Unbalanced Aggregate (Difference: ${currencyCode} ${difference.toFixed(2)})`}
                </h4>
                <p className={`text-xs ${isBalanced ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                  Sum of active debits must strictly equal sum of active credits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-sm">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Total Debits</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {currencyCode} {totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-sans">Total Credits</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {currencyCode} {totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Entry Lines Table */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Posting Entry Lines ({entries.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Specify transaction lines, GL account types, debit/credit indicators, and amounts.
              </p>
            </div>

            <button
              type="button"
              onClick={addEntryLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-2 w-10 text-center">Seq</th>
                  <th className="py-2.5 px-2 w-40">Entry Type</th>
                  <th className="py-2.5 px-2 w-24">Acct Type</th>
                  <th className="py-2.5 px-2 w-24 text-center">Dr / Cr</th>
                  <th className="py-2.5 px-2">Narration</th>
                  <th className="py-2.5 px-2 w-32">Acct Number</th>
                  <th className="py-2.5 px-2 w-32">Branch Type</th>
                  <th className="py-2.5 px-2 w-32 text-right">Amount</th>
                  <th className="py-2.5 px-2 w-20 text-center">Status</th>
                  <th className="py-2.5 px-2 w-12 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {entries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-700/30 ${
                      !entry.active ? 'opacity-40 bg-slate-100/50 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    {/* Seq */}
                    <td className="py-2 px-2 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Entry Type */}
                    <td className="py-2 px-2">
                      <select
                        value={entry.posting_entry_type}
                        onChange={(e) => updateEntryField(idx, 'posting_entry_type', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      >
                        {entryTypes.map((et) => (
                          <option key={et.id} value={et.posting_entry_type}>
                            {et.posting_entry_type}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Account Type */}
                    <td className="py-2 px-2">
                      <select
                        value={entry.posting_account_type || 'GL'}
                        onChange={(e) => updateEntryField(idx, 'posting_account_type', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      >
                        <option value="GL">GL</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    </td>

                    {/* Dr / Cr */}
                    <td className="py-2 px-2 text-center">
                      <select
                        value={entry.dr_cr}
                        onChange={(e) => updateEntryField(idx, 'dr_cr', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      >
                        <option value="D">D (Debit)</option>
                        <option value="C">C (Credit)</option>
                      </select>
                    </td>

                    {/* Narration */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        required
                        value={entry.narration}
                        onChange={(e) => updateEntryField(idx, 'narration', e.target.value)}
                        placeholder="Narration..."
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      />
                    </td>

                    {/* Account Number */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={entry.posting_account_number || ''}
                        onChange={(e) => updateEntryField(idx, 'posting_account_number', e.target.value)}
                        placeholder="e.g. 160680094"
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      />
                    </td>

                    {/* Branch Type */}
                    <td className="py-2 px-2">
                      <select
                        value={entry.posting_branch_type || ''}
                        onChange={(e) => updateEntryField(idx, 'posting_branch_type', e.target.value)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      >
                        <option value="">— Select —</option>
                        {branchTypes.map((bt) => (
                          <option key={bt.id} value={bt.posting_branch_type}>
                            {bt.posting_branch_type} ({bt.posting_branch_name})
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Amount */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={entry.amount}
                        onChange={(e) => updateEntryField(idx, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono text-right font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-slate-100"
                      />
                    </td>

                    {/* Line Status */}
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        entry.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {entry.active ? 'Active' : 'Retired'}
                      </span>
                    </td>

                    {/* Row Actions: Entry Copy & Soft Retire / Restore */}
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => copyEntryLine(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded transition-colors"
                          title="Copy Entry Line"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleRetireEntryLine(idx)}
                          className={`p-1 rounded transition-colors ${
                            entry.active
                              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                          title={entry.active ? 'Soft-Retire Entry Line (active = False)' : 'Reactivate Entry Line'}
                        >
                          {entry.active ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Submit Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/card-charges')}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || !isBalanced}
            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Submitting Change...' : 'Submit for Maker/Checker Approval'}
          </button>
        </div>
      </form>
    </div>
  )
}
