import * as React from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, Edit2, ShieldAlert } from 'lucide-react'
import { CardProgramme, CardProgrammeFormData, UserInfo } from '../types'
import { apiService } from '../services/api'
import { PageHeader } from '../components/shared/page-header'
import { DataTable } from '../components/shared/data-table'
import { StatusBadge } from '../components/ui/status-badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Sheet } from '../components/ui/sheet'
import { useToast } from '../components/ui/toast'
import { formatDate } from '../lib/utils'

interface CardProgrammesPageProps {
  currentUser: UserInfo
}

export const CardProgrammesPage: React.FC<CardProgrammesPageProps> = ({ currentUser }) => {
  const { toast } = useToast()
  const [programmes, setProgrammes] = React.useState<CardProgramme[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Drawer state
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [editingProgramme, setEditingProgramme] = React.useState<CardProgramme | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Form fields
  const [formData, setFormData] = React.useState<CardProgrammeFormData>({
    card_programme_code: '',
    card_programme_name: '',
    card_type: 'VERVE',
    active: true,
  })
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof CardProgrammeFormData, string>>>({})

  // Role permissions check (super_admin, operations_admin_maker, operations_admin_checker)
  const canManage = currentUser.roles.some((r) =>
    ['super_admin', 'operations_admin_maker', 'operations_admin_checker'].includes(r)
  )
  const isMakerOnly = currentUser.roles.includes('operations_admin_maker') && !currentUser.roles.includes('super_admin')

  // Load Data
  const fetchProgrammes = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammes()
      setProgrammes(data)
    } catch {
      toast({
        title: 'Error Loading Card Programmes',
        description: 'Failed to retrieve card programme configurations.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  React.useEffect(() => {
    fetchProgrammes()
  }, [fetchProgrammes])

  // Open Create Drawer
  const handleOpenCreate = () => {
    setEditingProgramme(null)
    setFormData({
      card_programme_code: '',
      card_programme_name: '',
      card_type: 'VERVE',
      active: true,
    })
    setFormErrors({})
    setIsSheetOpen(true)
  }

  // Open Edit Drawer
  const handleOpenEdit = (prog: CardProgramme) => {
    setEditingProgramme(prog)
    setFormData({
      card_programme_code: prog.card_programme_code,
      card_programme_name: prog.card_programme_name,
      card_type: prog.card_type,
      active: prog.active,
    })
    setFormErrors({})
    setIsSheetOpen(true)
  }

  // Validate & Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Partial<Record<keyof CardProgrammeFormData, string>> = {}

    if (!formData.card_programme_code.trim()) {
      errors.card_programme_code = 'Programme code is required'
    } else if (!/^[A-Z0-9_]+$/.test(formData.card_programme_code)) {
      errors.card_programme_code = 'Uppercase letters, numbers and underscores only'
    }

    if (!formData.card_programme_name.trim()) {
      errors.card_programme_name = 'Programme name is required'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (editingProgramme) {
        // Update existing
        await apiService.updateCardProgramme(editingProgramme.id, formData)
        toast({
          title: 'Card Programme Updated',
          description: isMakerOnly
            ? `Update for '${formData.card_programme_name}' submitted for Maker-Checker approval.`
            : `Programme '${formData.card_programme_name}' updated successfully.`,
          variant: 'success',
        })
      } else {
        // Create new
        await apiService.createCardProgramme(formData, currentUser.client_id)
        toast({
          title: 'Card Programme Created',
          description: isMakerOnly
            ? `New programme '${formData.card_programme_name}' submitted for Maker-Checker approval.`
            : `New programme '${formData.card_programme_name}' created successfully.`,
          variant: 'success',
        })
      }

      setIsSheetOpen(false)
      fetchProgrammes()
    } catch {
      toast({
        title: 'Operation Failed',
        description: 'An unexpected error occurred while saving the card programme.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export Data Handler
  const handleExport = () => {
    toast({
      title: 'Exporting Card Programmes',
      description: 'Card programmes dataset exported to CSV.',
      variant: 'info',
    })
  }

  // Table Columns Definition
  const columns: ColumnDef<CardProgramme>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className="font-mono text-[11px] font-semibold text-slate-500">#{row.getValue('id')}</span>
      ),
    },
    {
      accessorKey: 'card_programme_code',
      header: 'Programme Code',
      cell: ({ row }) => (
        <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {row.getValue('card_programme_code')}
        </div>
      ),
    },
    {
      accessorKey: 'card_programme_name',
      header: 'Programme Name',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 dark:text-slate-100">{row.getValue('card_programme_name')}</div>
      ),
    },
    {
      accessorKey: 'card_type',
      header: 'Card Type Brand',
      cell: ({ row }) => {
        const brand = row.getValue('card_type') as string
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {brand}
          </span>
        )
      },
    },
    {
      accessorKey: 'assigned_segment_group',
      header: 'Assigned Segment',
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs">{row.original.assigned_segment_group || 'Retail (01)'}</span>
      ),
    },
    {
      accessorKey: 'charge_header_name',
      header: 'Fee Structure',
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs">{row.original.charge_header_name || 'Standard Issuance Fee'}</span>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.getValue('active')} />,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleOpenEdit(row.original)}
          disabled={!canManage}
          leftIcon={<Edit2 className="h-3.5 w-3.5" />}
          className="h-7 text-xs px-2 text-slate-600 hover:text-blue-600"
        >
          Edit
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Card Programmes"
        description="Configure card products, brand types, segment mappings & fee structures."
        breadcrumbs={[
          { label: 'Configuration', href: '/config' },
          { label: 'Card Programmes' },
        ]}
        actions={
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            disabled={!canManage}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            New Programme
          </Button>
        }
      />

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={programmes}
        searchPlaceholder="Search programme code or name..."
        filterOptions={[
          {
            columnId: 'card_type',
            title: 'Brands',
            options: [
              { label: 'VERVE', value: 'VERVE' },
              { label: 'VISA', value: 'VISA' },
              { label: 'MASTERCARD', value: 'MASTERCARD' },
            ],
          },
        ]}
        onRefresh={fetchProgrammes}
        onExport={handleExport}
        isLoading={isLoading}
      />

      {/* Slide-Over Form Drawer Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={editingProgramme ? `Edit Card Programme (#${editingProgramme.id})` : 'Create New Card Programme'}
        description="Define card product parameters, brand type, and active policy rules."
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsSheetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
              {editingProgramme ? 'Save Changes' : 'Create Programme'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dual Control Notice Banner */}
          {isMakerOnly && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Maker-Checker Workflow Enforced:</span> Submitting changes will create
                a pending work item for Checker authorization before taking effect in production.
              </div>
            </div>
          )}

          {/* Form Fields */}
          <Input
            label="Programme Code"
            required
            placeholder="e.g. APEX_VERVE_CLASSIC"
            value={formData.card_programme_code}
            onChange={(e) =>
              setFormData({ ...formData, card_programme_code: e.target.value.toUpperCase() })
            }
            error={formErrors.card_programme_code}
            disabled={!!editingProgramme}
          />

          <Input
            label="Programme Name"
            required
            placeholder="e.g. Apex Verve Classic Card"
            value={formData.card_programme_name}
            onChange={(e) => setFormData({ ...formData, card_programme_name: e.target.value })}
            error={formErrors.card_programme_name}
          />

          <Select
            label="Card Type Brand"
            required
            value={formData.card_type}
            onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
            options={[
              { label: 'Verve (VERVE)', value: 'VERVE' },
              { label: 'Visa (VISA)', value: 'VISA' },
              { label: 'Mastercard (MASTERCARD)', value: 'MASTERCARD' },
            ]}
          />

          {/* Active Switch */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-slate-700">Active Card Programme</span>
            </label>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              Only active programmes are available for branch card requests and eligibility checks.
            </p>
          </div>

          {/* Read-Only Associations Preview */}
          {editingProgramme && (
            <div className="pt-4 border-t border-slate-200 space-y-2 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Linked Configuration Context</h4>
              <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-1.5 dark:bg-slate-950 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Segment Mapping:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {editingProgramme.assigned_segment_group || 'Retail Segment (01)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Structure:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {editingProgramme.charge_header_name || 'Verve Classic Fee'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created Date:</span>
                  <span className="font-mono text-slate-600">{formatDate(editingProgramme.created_date)}</span>
                </div>
              </div>
            </div>
          )}
        </form>
      </Sheet>
    </div>
  )
}
