import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CardProgramme, CardProgrammeFormData, UserInfo, CardType } from '../../types'
import { apiService } from '../../services/api'
import { useToast } from '../../components/ui/toast'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Breadcrumb } from '../../components/ui/breadcrumb'
import { PageHeader } from '../../components/shared/page-header'
import { ShieldAlert, ArrowLeft, Loader2, Save } from 'lucide-react'

export interface CardProgrammeFormProps {
  currentUser: UserInfo
}

export const CardProgrammeForm: React.FC<CardProgrammeFormProps> = ({ currentUser }) => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const isEditMode = Boolean(id)
  const programmeId = id ? parseInt(id, 10) : null

  const [cardTypes, setCardTypes] = React.useState<CardType[]>([])
  const [isLoadingProgramme, setIsLoadingProgramme] = React.useState(isEditMode)
  const [editingProgramme, setEditingProgramme] = React.useState<CardProgramme | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [formData, setFormData] = React.useState<CardProgrammeFormData>({
    card_programme_code: '',
    card_programme_name: '',
    card_type: '',
    active: true,
  })
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof CardProgrammeFormData, string>>>({})

  const isMakerOnly = currentUser.roles.includes('operations_admin_maker') && !currentUser.roles.includes('super_admin')

  // Fetch Card Types
  React.useEffect(() => {
    apiService.getCardTypes().then((types) => {
      setCardTypes(types)
      if (!isEditMode && types.length > 0 && !formData.card_type) {
        setFormData((prev) => ({ ...prev, card_type: types[0].card_type }))
      }
    }).catch(() => {})
  }, [isEditMode])

  // Fetch Existing Programme if Edit Mode
  React.useEffect(() => {
    if (isEditMode && programmeId) {
      setIsLoadingProgramme(true)
      apiService
        .getCardProgrammes()
        .then((programmes) => {
          const found = programmes.find((p) => p.id === programmeId)
          if (found) {
            setEditingProgramme(found)
            setFormData({
              card_programme_code: found.card_programme_code,
              card_programme_name: found.card_programme_name,
              card_type: found.card_type,
              active: found.active,
            })
          } else {
            toast({
              title: 'Programme Not Found',
              description: `Card Programme #${programmeId} could not be located.`,
              variant: 'destructive',
            })
            navigate('/card-programmes', { replace: true })
          }
        })
        .catch(() => {
          toast({
            title: 'Error Loading Programme',
            description: 'Failed to retrieve card programme details.',
            variant: 'destructive',
          })
          navigate('/card-programmes', { replace: true })
        })
        .finally(() => setIsLoadingProgramme(false))
    }
  }, [isEditMode, programmeId, navigate, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Partial<Record<keyof CardProgrammeFormData, string>> = {}

    const cleanCode = formData.card_programme_code.trim().toUpperCase()
    const cleanName = formData.card_programme_name.trim()

    if (!isEditMode) {
      if (!cleanCode) {
        errors.card_programme_code = 'Programme code is required'
      } else if (cleanCode.length > 35) {
        errors.card_programme_code = 'Programme code cannot exceed 35 characters'
      } else if (!/^[A-Z0-9_-]+$/.test(cleanCode)) {
        errors.card_programme_code = 'Uppercase letters, numbers, hyphens and underscores only'
      }
    }

    if (!cleanName) {
      errors.card_programme_name = 'Programme name is required'
    } else if (cleanName.length > 100) {
      errors.card_programme_name = 'Programme name cannot exceed 100 characters'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (isMakerOnly) {
        const workItem = await apiService.submitMakerCheckerWorkItem({
          entity_type: 'card_programmes',
          entity_id: editingProgramme ? editingProgramme.id : undefined,
          operation: editingProgramme ? 'UPDATE' : 'CREATE',
          maker_remarks: `Card programme ${editingProgramme ? 'update' : 'creation'} for ${cleanName}`,
          payload: {
            client_id: currentUser.client_id,
            card_programme_code: cleanCode,
            card_programme_name: cleanName,
            card_type: formData.card_type,
            active: formData.active,
          },
        })

        toast({
          title: 'Maker-Checker Work Item Submitted',
          description: `Work Item #${workItem.work_item_id} sent for Checker authorization.`,
          variant: 'info',
        })
      } else {
        if (editingProgramme) {
          await apiService.updateCardProgramme(editingProgramme.id, {
            ...formData,
            card_programme_code: cleanCode,
            card_programme_name: cleanName,
          })
          toast({
            title: 'Card Programme Updated',
            description: `Programme '${cleanName}' updated successfully.`,
            variant: 'success',
          })
        } else {
          await apiService.createCardProgramme(
            {
              ...formData,
              card_programme_code: cleanCode,
              card_programme_name: cleanName,
            },
            currentUser.client_id
          )
          toast({
            title: 'Card Programme Created',
            description: `New programme '${cleanName}' created successfully.`,
            variant: 'success',
          })
        }
      }

      if (editingProgramme) {
        navigate(`/card-programmes/${editingProgramme.id}`)
      } else {
        navigate('/card-programmes')
      }
    } catch (err: any) {
      toast({
        title: 'Operation Failed',
        description: err.message || 'An unexpected error occurred while saving the card programme.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (editingProgramme) {
      navigate(`/card-programmes/${editingProgramme.id}`)
    } else {
      navigate('/card-programmes')
    }
  }

  if (isLoadingProgramme) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
        Loading Card Programme configuration...
      </div>
    )
  }

  const pageTitle = isEditMode ? `Edit Card Programme (${formData.card_programme_code || '#' + programmeId})` : 'New Card Programme'
  const pageDescription = isEditMode
    ? 'Modify payment card product parameters, brand association, and active status.'
    : 'Define product parameters, select card scheme brand, and set operational flags.'

  const breadcrumbs: Array<{ label: string; onClick?: () => void }> = [
    { label: 'Configuration', onClick: () => navigate('/card-programmes') },
    { label: 'Card Programmes', onClick: () => navigate('/card-programmes') },
  ]
  if (isEditMode && editingProgramme) {
    breadcrumbs.push({ label: editingProgramme.card_programme_code, onClick: () => navigate(`/card-programmes/${editingProgramme.id}`) })
    breadcrumbs.push({ label: 'Edit' })
  } else {
    breadcrumbs.push({ label: 'New Card Programme' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumbs */}
      <Breadcrumb items={breadcrumbs} />

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PageHeader
          title={pageTitle}
          description={pageDescription}
        />
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-2xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {isMakerOnly && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Maker-Checker Workflow Enforced:</span> Submitting changes will create
                a pending work item for Checker authorization before taking effect in production.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Programme Code"
              required
              maxLength={35}
              placeholder="e.g. APEX_VERVE_CLASSIC"
              value={formData.card_programme_code}
              onChange={(e) =>
                setFormData({ ...formData, card_programme_code: e.target.value.toUpperCase() })
              }
              error={formErrors.card_programme_code}
              helperText="Uppercase alphanumeric characters, hyphens & underscores only (Max 35 chars)."
              disabled={isEditMode}
            />

            <Input
              label="Programme Name"
              required
              maxLength={100}
              placeholder="e.g. Apex Verve Classic Card"
              value={formData.card_programme_name}
              onChange={(e) => setFormData({ ...formData, card_programme_name: e.target.value })}
              error={formErrors.card_programme_name}
              helperText="Descriptive business name for branch operators (Max 100 chars)."
            />

            <Select
              label="Card Type Brand"
              required
              value={formData.card_type}
              onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
              options={cardTypes.map((ct) => ({
                label: ct.description ? `${ct.description} (${ct.card_type})` : ct.card_type,
                value: ct.card_type,
              }))}
            />

            <div className="flex flex-col justify-center pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Active Card Programme</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 pl-6">
                Only active programmes are available for branch card requests and eligibility checks.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isEditMode ? 'Save Changes' : 'Create Programme'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
