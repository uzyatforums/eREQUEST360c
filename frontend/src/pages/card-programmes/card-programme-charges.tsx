import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { CardProgramme, UserInfo } from '../../types'
import { ParentSummaryBanner } from '../../components/card-programmes/parent-summary-banner'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { StatusBadge } from '../../components/ui/status-badge'
import { Button } from '../../components/ui/button'
import { Tooltip } from '../../components/ui/tooltip'
import { Sheet } from '../../components/ui/sheet'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { useToast } from '../../components/ui/toast'
import { Checkbox } from '../../components/ui/checkbox'
import { SelectionToolbar } from '../../components/ui/selection-toolbar'
import { SortableHeader, SortOrder } from '../../components/ui/sortable-header'
import { useRowSelection } from '../../hooks/use-row-selection'

export interface CardProgrammeChargesProps {
  programme: CardProgramme
  currentUser: UserInfo
  onBackToDetails?: () => void
  onBackToList?: () => void
  onEditParent?: () => void
}

export interface DetailedChargeEntry {
  id: number
  sequence: number
  posting_account_type: string
  debit_credit: 'DEBIT' | 'CREDIT'
  entry_type: string
  narration: string
  account_number: string
  branch_type: string
  amount: number
  currency: string
  charge_profile_name: string
  active: boolean
}

export const CardProgrammeCharges: React.FC<CardProgrammeChargesProps> = ({
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

  const [searchQuery, setSearchQuery] = React.useState('')
  const [isAddSheetOpen, setIsAddSheetOpen] = React.useState(false)

  // Sorting State
  const [sortField, setSortField] = React.useState<string | null>('sequence')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc')
      else if (sortOrder === 'desc') {
        setSortField(null)
        setSortOrder(null)
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Demo Charge Entries State with rich columns and NGN currency
  const [chargeEntries, setChargeEntries] = React.useState<DetailedChargeEntry[]>([
    {
      id: 1,
      sequence: 1,
      posting_account_type: 'CARD_ISSUANCE_FEE',
      debit_credit: 'DEBIT',
      entry_type: 'SYSTEM',
      narration: `Card Issuance Fee - ${programme.card_programme_name}`,
      account_number: 'GL_3002938491',
      branch_type: 'ISSUING_BRANCH',
      amount: 1000.0,
      currency: 'NGN',
      charge_profile_name: `${programme.card_type} Standard Fee Profile`,
      active: true,
    },
    {
      id: 2,
      sequence: 2,
      posting_account_type: 'VAT_CHARGE',
      debit_credit: 'DEBIT',
      entry_type: 'SYSTEM',
      narration: `7.5% VAT on Card Issuance - ${programme.card_programme_code}`,
      account_number: 'GL_2001928374',
      branch_type: 'HEAD_OFFICE',
      amount: 75.0,
      currency: 'NGN',
      charge_profile_name: `${programme.card_type} VAT Tax Rule`,
      active: true,
    },
  ])

  // Form State for Add Entry
  const [narration, setNarration] = React.useState(`Card Fee Entry - ${programme.card_programme_code}`)
  const [postingAccountType, setPostingAccountType] = React.useState('MAINTENANCE_FEE')
  const [debitCredit, setDebitCredit] = React.useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [accountNumber, setAccountNumber] = React.useState('GL_4009283741')
  const [amount, setAmount] = React.useState(500)
  const [currency, setCurrency] = React.useState('NGN')

  const canManage = currentUser.roles.some((r) =>
    ['super_admin', 'operations_admin_maker', 'operations_admin_checker'].includes(r)
  )

  const filteredEntries = React.useMemo(() => {
    const list = chargeEntries.filter(
      (c) =>
        c.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.posting_account_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.account_number.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!sortField || !sortOrder) return list

    return [...list].sort((a: any, b: any) => {
      const valA = a[sortField] ?? ''
      const valB = b[sortField] ?? ''

      let comp = 0
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB
      } else {
        comp = String(valA).localeCompare(String(valB))
      }

      return sortOrder === 'asc' ? comp : -comp
    })
  }, [chargeEntries, searchQuery, sortField, sortOrder])

  // Selection Hook
  const {
    selectedCount,
    isSelected,
    toggleRow,
    clearSelection,
    isAllSelected,
    isSomeSelected,
    toggleSelectAll,
  } = useRowSelection<DetailedChargeEntry>({
    items: filteredEntries,
    getKey: (c) => c.id,
  })

  const handleAddChargeEntry = (e: React.FormEvent) => {
    e.preventDefault()
    const newEntry: DetailedChargeEntry = {
      id: Date.now(),
      sequence: chargeEntries.length + 1,
      posting_account_type: postingAccountType,
      debit_credit: debitCredit,
      entry_type: 'MANUAL',
      narration,
      account_number: accountNumber,
      branch_type: 'ISSUING_BRANCH',
      amount: Number(amount),
      currency,
      charge_profile_name: `${programme.card_type} Custom Fee Profile`,
      active: true,
    }
    setChargeEntries((prev) => [...prev, newEntry])
    setIsAddSheetOpen(false)
    toast({
      title: 'Charge Entry Added',
      description: `Added fee entry '${narration}' successfully.`,
      variant: 'success',
    })
  }

  const handleDeleteEntry = (id: number) => {
    setChargeEntries((prev) => prev.filter((e) => e.id !== id))
    toast({
      title: 'Charge Entry Removed',
      description: 'Fee entry removed successfully.',
      variant: 'info',
    })
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: 'Configuration', onClick: handleBackToList },
          { label: 'Card Programmes', onClick: handleBackToList },
          { label: programme.card_programme_code, onClick: handleBackToDetails },
          { label: 'Charges' },
        ]}
      />

      {/* Parent Summary Banner */}
      <ParentSummaryBanner
        programme={programme}
        onEditParent={handleEditParent}
        onBackToDetails={handleBackToDetails}
        onBackToList={handleBackToList}
        currentChildName="Charges & Fee Profile Workspace"
      />

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search posting account, narration or GL number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button variant="primary" size="sm" onClick={() => setIsAddSheetOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Add Fee Entry
            </Button>
          )}
        </div>
      </div>

      {/* Selection Status Bar */}
      <SelectionToolbar
        selectedCount={selectedCount}
        totalCount={filteredEntries.length}
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
                    aria-label="Select all fee entries"
                  />
                </th>
                <th className="py-3 px-4 text-center">
                  <SortableHeader
                    label="Seq"
                    sortField="sequence"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-3 px-4">
                  <SortableHeader
                    label="Posting Account Type"
                    sortField="posting_account_type"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4 text-center">
                  <SortableHeader
                    label="DR/CR"
                    sortField="debit_credit"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  />
                </th>
                <th className="py-3 px-4 text-center">Entry Type</th>
                <th className="py-3 px-4">
                  <SortableHeader
                    label="Narration"
                    sortField="narration"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4 font-mono">
                  <SortableHeader
                    label="GL Account"
                    sortField="account_number"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="py-3 px-4">Branch Type</th>
                <th className="py-3 px-4 text-right">
                  <SortableHeader
                    label="Amount (NGN)"
                    sortField="amount"
                    currentSortField={sortField}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                </th>
                <th className="py-3 px-4 text-center">Currency</th>
                <th className="py-3 px-4">Charge Profile</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    No charge entries configured for this card programme.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const selected = isSelected(entry.id)
                  return (
                    <tr
                      key={entry.id}
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
                          onChange={() => toggleRow(entry.id)}
                          aria-label={`Select fee entry ${entry.narration}`}
                        />
                      </td>

                      {/* Seq */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500">
                        #{entry.sequence}
                      </td>

                      {/* Posting Account Type */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {entry.posting_account_type}
                      </td>

                      {/* DR/CR */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            entry.debit_credit === 'DEBIT'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {entry.debit_credit === 'DEBIT' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {entry.debit_credit}
                        </span>
                      </td>

                      {/* Entry Type */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {entry.entry_type}
                        </span>
                      </td>

                      {/* Narration */}
                      <td className="py-3.5 px-4 font-medium max-w-[220px] truncate">
                        {entry.narration}
                      </td>

                      {/* GL Account */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {entry.account_number}
                      </td>

                      {/* Branch Type */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {entry.branch_type}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        ₦{entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Currency */}
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 dark:text-slate-400">
                        {entry.currency}
                      </td>

                      {/* Charge Profile */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {entry.charge_profile_name}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={entry.active} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {canManage && (
                          <Tooltip content="Delete Fee Entry">
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Charge Sheet Drawer */}
      <Sheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        title="Add Fee Entry"
        description={`Define posting rule parameters for '${programme.card_programme_name}'.`}
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsAddSheetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddChargeEntry}>
              Add Fee Entry
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddChargeEntry} className="space-y-4">
          <Input
            label="Narration"
            required
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            helperText="Description for ledger transaction entries."
          />

          <Select
            label="Posting Account Type"
            required
            value={postingAccountType}
            onChange={(e) => setPostingAccountType(e.target.value)}
            options={[
              { label: 'Card Issuance Fee (CARD_ISSUANCE_FEE)', value: 'CARD_ISSUANCE_FEE' },
              { label: 'Annual Maintenance Fee (MAINTENANCE_FEE)', value: 'MAINTENANCE_FEE' },
              { label: 'VAT Tax Charge (VAT_CHARGE)', value: 'VAT_CHARGE' },
              { label: 'PIN Selection Fee (PIN_FEE)', value: 'PIN_FEE' },
            ]}
          />

          <Select
            label="Debit / Credit Indicator"
            required
            value={debitCredit}
            onChange={(e) => setDebitCredit(e.target.value as 'DEBIT' | 'CREDIT')}
            options={[
              { label: 'Debit (DEBIT)', value: 'DEBIT' },
              { label: 'Credit (CREDIT)', value: 'CREDIT' },
            ]}
          />

          {/* GL Account Lookup Dropdown */}
          <Select
            label="GL Account Lookup"
            required
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            options={[
              { label: 'GL_3002938491 - Card Issuance Income Account', value: 'GL_3002938491' },
              { label: 'GL_2001928374 - FIRS VAT Payable Account', value: 'GL_2001928374' },
              { label: 'GL_4009283741 - Card Production Expense Account', value: 'GL_4009283741' },
              { label: 'GL_1009876543 - Branch Clearing Suspense Account', value: 'GL_1009876543' },
            ]}
            helperText="General ledger account code for fee posting."
          />

          {/* Fee Amount (₦) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Fee Amount (₦)
            </label>
            <div className="relative rounded-md shadow-2xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 font-bold text-xs">
                ₦
              </div>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          <Select
            label="Currency"
            required
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={[
              { label: 'Nigerian Naira (NGN / ₦)', value: 'NGN' },
              { label: 'US Dollar (USD)', value: 'USD' },
              { label: 'Euro (EUR)', value: 'EUR' },
            ]}
          />
        </form>
      </Sheet>
    </div>
  )
}
