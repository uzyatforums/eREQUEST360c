import * as React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Shield,
  CreditCard,
  Building2,
  Lock,
  ArrowLeft,
  Save,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  Coins,
  Info,
} from 'lucide-react'
import { CardProgramme, UserInfo, CardType } from '../../types'
import { apiService } from '../../services/api'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Breadcrumb, BreadcrumbItem } from '../../components/ui/breadcrumb'
import { useToast } from '../../components/ui/toast'

export interface CardProgrammeFormProps {
  currentUser: UserInfo
  onSaveSuccess?: (saved?: CardProgramme) => void
}

export const CardProgrammeForm: React.FC<CardProgrammeFormProps> = ({ currentUser, onSaveSuccess }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const isEditMode = !!id
  const programmeId = id ? parseInt(id, 10) : null
  const copyFromIdStr = searchParams.get('copyFrom')
  const copyFromId = copyFromIdStr ? parseInt(copyFromIdStr, 10) : null

  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [cardTypes, setCardTypes] = React.useState<CardType[]>([])
  const [editingProgramme, setEditingProgramme] = React.useState<CardProgramme | null>(null)
  const hasNotifiedCopyRef = React.useRef<number | null>(null)

  // Form State Fields
  const [cardProgrammeCode, setCardProgrammeCode] = React.useState('')
  const [cardProgrammeName, setCardProgrammeName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [cardType, setCardType] = React.useState('VERVE')
  const [bin, setBin] = React.useState('506118')
  const [platformIndicator, setPlatformIndicator] = React.useState('POSTILION_V2')
  const [serviceCode, setServiceCode] = React.useState('201')
  const [panLength, setPanLength] = React.useState(16)
  const [defaultValidityYears, setDefaultValidityYears] = React.useState(3)
  const [currency, setCurrency] = React.useState('NGN')
  const [issuanceFee, setIssuanceFee] = React.useState(1000)
  const [maintenanceFee, setMaintenanceFee] = React.useState(250)
  const [accountTypeBinding, setAccountTypeBinding] = React.useState('SAVINGS_CURRENT')
  const [active, setActive] = React.useState(true)

  // Operational Control Flags
  const [instantIssuanceAllowed, setInstantIssuanceAllowed] = React.useState(true)
  const [contactlessEnabled, setContactlessEnabled] = React.useState(true)
  const [pinMailerAllowed, setPinMailerAllowed] = React.useState(true)
  const [ecommerceAllowed, setEcommerceAllowed] = React.useState(true)
  const [atmWithdrawalAllowed, setAtmWithdrawalAllowed] = React.useState(true)

  // Fetch Lookup Data
  React.useEffect(() => {
    apiService
      .getCardTypes()
      .then((types) => {
        setCardTypes(types)
        if (types.length > 0 && !isEditMode && !copyFromId) {
          setCardType(types[0].card_type)
        }
      })
      .catch(() => { })
  }, [isEditMode, copyFromId])

  // Fetch Existing Record for Edit Mode or Copy Mode
  React.useEffect(() => {
    if (isEditMode && programmeId) {
      setIsLoading(true)
      apiService
        .getCardProgrammeById(programmeId)
        .then((found) => {
          if (found) {
            setEditingProgramme(found)
            setCardProgrammeCode(found.card_programme_code)
            setCardProgrammeName(found.card_programme_name)
            setDescription(found.description || `${found.card_programme_name} product specification.`)
            setCardType(found.card_type)
            setBin(found.bin || '506118')
            setPlatformIndicator(found.platform_indicator || 'POSTILION_V2')
            setServiceCode(found.service_code || '201')
            setPanLength(found.pan_length || 16)
            setDefaultValidityYears(found.default_validity_years || 3)
            setCurrency(found.currency || 'NGN')
            setIssuanceFee(found.issuance_fee || 1000)
            setMaintenanceFee(found.maintenance_fee || 250)
            setAccountTypeBinding(found.account_type_binding || 'SAVINGS_CURRENT')
            setActive(found.active)
          } else {
            toast({
              title: 'Programme Not Found',
              description: `Card Programme #${id} could not be loaded.`,
              variant: 'destructive',
            })
            navigate('/card-programmes')
          }
        })
        .catch(() => {
          toast({
            title: 'Fetch Error',
            description: 'Failed to load programme specifications from API.',
            variant: 'destructive',
          })
        })
        .finally(() => setIsLoading(false))
    } else if (!isEditMode && copyFromId) {
      if (hasNotifiedCopyRef.current === copyFromId) {
        return
      }
      setIsLoading(true)
      apiService
        .getCardProgrammeById(copyFromId)
        .then((found) => {
          if (found) {
            // Pre-populate fields for Copy mode (Do NOT copy Primary key, audit fields, or Programme Code)
            setCardProgrammeCode('') // Leave blank for user entry
            setCardProgrammeName(`${found.card_programme_name} (Copy)`) // Pre-populate as "<Original Name> (Copy)"
            setDescription(found.description || `${found.card_programme_name} product specification copy.`)
            setCardType(found.card_type)
            setBin(found.bin || '506118')
            setPlatformIndicator(found.platform_indicator || 'POSTILION_V2')
            setServiceCode(found.service_code || '201')
            setPanLength(found.pan_length || 16)
            setDefaultValidityYears(found.default_validity_years || 3)
            setCurrency(found.currency || 'NGN')
            setIssuanceFee(found.issuance_fee || 1000)
            setMaintenanceFee(found.maintenance_fee || 250)
            setAccountTypeBinding(found.account_type_binding || 'SAVINGS_CURRENT')
            setActive(found.active)

            if (hasNotifiedCopyRef.current !== copyFromId) {
              hasNotifiedCopyRef.current = copyFromId
              toast({
                title: 'Specifications Pre-Populated',
                description: `Pre-populated form from '${found.card_programme_name}'. Enter a unique Programme Code before saving.`,
                variant: 'success',
              })
            }
          }
        })
        .catch(() => {
          toast({
            title: 'Copy Load Error',
            description: 'Failed to load source programme for copying.',
            variant: 'destructive',
          })
        })
        .finally(() => setIsLoading(false))
    }
  }, [isEditMode, programmeId, copyFromId, id, navigate, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cardProgrammeCode.trim() || !cardProgrammeName.trim()) {
      toast({
        title: 'Validation Failed',
        description: 'Programme Code and Name are required fields.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    const payload: Partial<CardProgramme> = {
      card_programme_code: cardProgrammeCode.trim().toUpperCase(),
      card_programme_name: cardProgrammeName.trim(),
      description: description.trim(),
      card_type: cardType,
      bin,
      platform_indicator: platformIndicator,
      service_code: serviceCode,
      pan_length: Number(panLength),
      default_validity_years: Number(defaultValidityYears),
      currency,
      issuance_fee: Number(issuanceFee),
      maintenance_fee: Number(maintenanceFee),
      account_type_binding: accountTypeBinding,
      active,
      client_id: currentUser.client_id || 100,
    }

    try {
      if (isEditMode && editingProgramme) {
        const updated = await apiService.updateCardProgramme(editingProgramme.id, payload)
        toast({
          title: 'Programme Specifications Updated',
          description: `Card Programme '${cardProgrammeName}' parameters updated successfully.`,
          variant: 'success',
        })
        if (onSaveSuccess) onSaveSuccess(updated)
        navigate(`/card-programmes/${editingProgramme.id}`)
      } else {
        const created = await apiService.createCardProgramme(payload)
        toast({
          title: 'Card Programme Created',
          description: `New card programme '${cardProgrammeName}' created successfully.`,
          variant: 'success',
        })
        if (onSaveSuccess) onSaveSuccess(created)
        navigate(`/card-programmes/${created.id}`)
      }
    } catch (err: any) {
      toast({
        title: 'Save Operation Failed',
        description: err.message || 'Could not persist card programme parameters.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Configuration', onClick: () => navigate('/card-programmes') },
    { label: 'Card Programmes', onClick: () => navigate('/card-programmes') },
  ]

  if (isEditMode && editingProgramme) {
    breadcrumbs.push({
      label: editingProgramme.card_programme_code,
      onClick: () => navigate(`/card-programmes/${editingProgramme.id}`),
    })
    breadcrumbs.push({ label: 'Edit Maintenance' })
  } else if (copyFromId) {
    breadcrumbs.push({ label: 'Copy Card Programme' })
  } else {
    breadcrumbs.push({ label: 'New Card Programme' })
  }

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Sparkles className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
        Loading Card Programme parameters...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <PageHeader
        title={
          isEditMode
            ? `Edit Card Programme: ${cardProgrammeCode}`
            : copyFromId
            ? 'Copy Card Programme Specification'
            : 'New Card Programme Maintenance'
        }
        description={
          isEditMode
            ? 'Modify payment card product parameters, brand association, pricing rules, and operational flags.'
            : copyFromId
            ? 'Pre-populated parameters from existing programme. Enter a unique Programme Code and review parameters before saving.'
            : 'Define new card product parameters, select card scheme brand, set BIN routing, and set operational flags.'
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                navigate(isEditMode && editingProgramme ? `/card-programmes/${editingProgramme.id}` : '/card-programmes')
              }
              className="gap-1.5 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSubmit} isLoading={isSaving} className="gap-1.5 text-xs">
              <Save className="h-3.5 w-3.5" />
              {isEditMode ? 'Save Changes' : 'Create Card Programme'}
            </Button>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: General Product Identity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                1. General Product Identity
              </h2>
              <p className="text-xs text-slate-500">
                Primary identifier codes, descriptive titles, scheme branding, and tenant status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Programme Code */}
            <div>
              <Input
                label="Card Programme Code"
                required
                disabled={isEditMode}
                value={cardProgrammeCode}
                onChange={(e) => setCardProgrammeCode(e.target.value.toUpperCase())}
                placeholder="e.g. AG-CL-NGN"
                helperText="Unique uppercase identifier code (e.g. AG-CL-NGN)."
                maxLength={30}
              />
            </div>

            {/* Programme Name */}
            <div>
              <Input
                label="Card Programme Name"
                required
                value={cardProgrammeName}
                onChange={(e) => setCardProgrammeName(e.target.value)}
                placeholder="e.g. Apex Verve Classic Card"
                helperText="Full descriptive product title displayed to customers."
                maxLength={100}
              />
            </div>

            {/* Card Scheme Brand */}
            <div>
              <Select
                label="Card Scheme Brand"
                required
                value={cardType}
                onChange={(e) => setCardType(e.target.value)}
                options={
                  cardTypes.length > 0
                    ? cardTypes.map((ct) => ({
                      label: `${ct.description || ct.card_type} (${ct.card_type})`,
                      value: ct.card_type,
                    }))
                    : [
                      { label: 'Verve (VERVE)', value: 'VERVE' },
                      { label: 'Visa (VISA)', value: 'VISA' },
                      { label: 'Mastercard (MCARD)', value: 'MCARD' },
                      { label: 'Afrigo (AFRIGO)', value: 'AFRIGO' },
                      { label: 'Verve Contactless (VCL)', value: 'VCL' },
                    ]
                }
                helperText="Payment scheme network association."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            {/* Product Description */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Product Description & Value Proposition
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Describe target market, usage limits, and product parameters..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Active Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Operational Status
              </label>
              <Select
                value={active ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setActive(e.target.value === 'ACTIVE')}
                options={[
                  { label: 'Active (Available for issuance)', value: 'ACTIVE' },
                  { label: 'Inactive (Disabled for new requests)', value: 'INACTIVE' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Card Scheme & BIN Parameters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                2. Card Scheme & BIN Parameters
              </h2>
              <p className="text-xs text-slate-500">
                Bank Identification Number routing, platform indicators, and PAN structure specifications.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
            {/* BIN Lookup */}
            <div>
              <Select
                label="Bank Identification Number (BIN)"
                required
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                options={[
                  { label: '506118 (Verve Debit National)', value: '506118' },
                  { label: '400123 (Visa International)', value: '400123' },
                  { label: '521456 (Mastercard World)', value: '521456' },
                  { label: '506119 (Verve Prepaid)', value: '506119' },
                ]}
                helperText="6-digit IIN/BIN prefix."
              />
            </div>

            {/* Platform Indicator Lookup */}
            <div>
              <Select
                label="Switch Platform Indicator"
                required
                value={platformIndicator}
                onChange={(e) => setPlatformIndicator(e.target.value)}
                options={[
                  { label: 'Postilion V2 (POSTILION_V2)', value: 'POSTILION_V2' },
                  { label: 'ISO 8583 Switch (ISO_8583)', value: 'ISO_8583' },
                  { label: 'Prime Card Management (PRIME)', value: 'PRIME' },
                  { label: 'Flexcube Interface (FLEXCUBE)', value: 'FLEXCUBE' },
                ]}
                helperText="Card authorization host engine."
              />
            </div>

            {/* Service Code Lookup */}
            <div>
              <Select
                label="EMV Service Code"
                required
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                options={[
                  { label: '201 (International, IC Chip, Normal)', value: '201' },
                  { label: '101 (International, Magnetic, Normal)', value: '101' },
                  { label: '221 (International, IC Chip, PIN Required)', value: '221' },
                ]}
                helperText="3-digit magnetic stripe / chip rule."
              />
            </div>

            {/* Default Expiry (Years) */}
            <div>
              <Select
                label="Default Validity Period"
                required
                value={String(defaultValidityYears)}
                onChange={(e) => setDefaultValidityYears(Number(e.target.value))}
                options={[
                  { label: '3 Years (Standard Debit)', value: '3' },
                  { label: '2 Years (Short Term)', value: '2' },
                  { label: '4 Years (Extended Validity)', value: '4' },
                  { label: '5 Years (Corporate Credit)', value: '5' },
                ]}
                helperText="Card expiration timeframe."
              />
            </div>

            {/* PAN Length */}
            <div>
              <Select
                label="PAN Character Length"
                required
                value={String(panLength)}
                onChange={(e) => setPanLength(Number(e.target.value))}
                options={[
                  { label: '16 Digits (ISO Standard)', value: '16' },
                  { label: '19 Digits (Verve Extended)', value: '19' },
                ]}
                helperText="Card account number digit length."
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Financial & Account Rules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                3. Financial & Pricing Rules
              </h2>
              <p className="text-xs text-slate-500">
                Default settlement currency, product fee parameters, and customer account bindings.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {/* Default Currency */}
            <div>
              <Select
                label="Base Currency"
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { label: 'Nigerian Naira (NGN)', value: 'NGN' },
                  { label: 'US Dollar (USD)', value: 'USD' },
                  { label: 'Euro (EUR)', value: 'EUR' },
                ]}
                helperText="Primary ledger settlement currency."
              />
            </div>

            {/* Card Issuance Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Card Issuance Fee
              </label>
              <input
                type="number"
                required
                value={issuanceFee}
                onChange={(e) => setIssuanceFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
              <p className="mt-1 text-[11px] text-slate-500">One-time initial issuance charge.</p>
            </div>

            {/* Annual Maintenance Fee */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Annual Maintenance Fee
              </label>
              <input
                type="number"
                required
                value={maintenanceFee}
                onChange={(e) => setMaintenanceFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 font-mono font-bold"
              />
              <p className="mt-1 text-[11px] text-slate-500">Recurring annual maintenance fee.</p>
            </div>

            {/* Account Type Binding */}
            <div>
              <Select
                label="Allowed Account Type Binding"
                required
                value={accountTypeBinding}
                onChange={(e) => setAccountTypeBinding(e.target.value)}
                options={[
                  { label: 'Savings & Current Accounts', value: 'SAVINGS_CURRENT' },
                  { label: 'Savings Account Only', value: 'SAVINGS_ONLY' },
                  { label: 'Current Account Only', value: 'CURRENT_ONLY' },
                  { label: 'Individual Accounts Only', value: 'INDIVIDUAL_ONLY' },
                  { label: 'Corporate Accounts Only', value: 'CORPORATE_ONLY' },
                ]}
                helperText="Eligible core account categories."
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Operational & System Controls */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                4. Operational & System Controls
              </h2>
              <p className="text-xs text-slate-500">
                Channel permissions, instant issuance flags, and security feature toggles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Instant Issuance */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Instant Branch Print
                </span>
                <span className="text-[11px] text-slate-500">In-branch personalization</span>
              </div>
              <input
                type="checkbox"
                checked={instantIssuanceAllowed}
                onChange={(e) => setInstantIssuanceAllowed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Contactless */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  NFC Contactless
                </span>
                <span className="text-[11px] text-slate-500">Tap to pay enabled</span>
              </div>
              <input
                type="checkbox"
                checked={contactlessEnabled}
                onChange={(e) => setContactlessEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* PIN Mailer */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  PIN Mailer Printing
                </span>
                <span className="text-[11px] text-slate-500">Physical paper mailer</span>
              </div>
              <input
                type="checkbox"
                checked={pinMailerAllowed}
                onChange={(e) => setPinMailerAllowed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* E-Commerce */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Web & E-Commerce
                </span>
                <span className="text-[11px] text-slate-500">Online 3DS payments</span>
              </div>
              <input
                type="checkbox"
                checked={ecommerceAllowed}
                onChange={(e) => setEcommerceAllowed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* ATM Withdrawal */}
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-900 dark:text-slate-100">
                  ATM Cash Dispense
                </span>
                <span className="text-[11px] text-slate-500">ATM transaction channel</span>
              </div>
              <input
                type="checkbox"
                checked={atmWithdrawalAllowed}
                onChange={(e) => setAtmWithdrawalAllowed(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: Audit Metadata (Read-Only) */}
        {isEditMode && editingProgramme && (
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold text-xs">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>5. Record Audit Metadata (Read-Only System Log)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
              <div>
                <span className="block text-slate-400 text-[11px]">Created By</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingProgramme.created_by || 'system_admin'}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 text-[11px]">Created Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingProgramme.created_date ? new Date(editingProgramme.created_date).toLocaleString() : 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 text-[11px]">Last Modified By</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingProgramme.last_modified_by || currentUser.user_id}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 text-[11px]">Last Modified Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingProgramme.last_modified_date
                    ? new Date(editingProgramme.last_modified_date).toLocaleString()
                    : 'N/A'}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 text-[11px]">Specification Version</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  v{editingProgramme.version || 1.0}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(isEditMode && editingProgramme ? `/card-programmes/${editingProgramme.id}` : '/card-programmes')
            }
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isEditMode ? 'Save Changes' : 'Create Card Programme'}
          </Button>
        </div>
      </form>
    </div>
  )
}
