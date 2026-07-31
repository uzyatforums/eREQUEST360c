import * as React from 'react'
import { Routes, Route, useParams, useNavigate } from 'react-router-dom'
import { CardProgramme, UserInfo, CardType } from '../types'
import { apiService } from '../services/api'
import { useToast } from '../components/ui/toast'
import { Dialog } from '../components/ui/dialog'
import { Loader2 } from 'lucide-react'

// Page Components
import { CardProgrammesList } from './card-programmes/card-programmes-list'
import { CardProgrammeDetails } from './card-programmes/card-programme-details'
import { CardProgrammeSegments } from './card-programmes/card-programme-segments'
import { CardProgrammeCharges } from './card-programmes/card-programme-charges'
import { CardProgrammeReferences } from './card-programmes/card-programme-references'
import { CardProgrammeAudit } from './card-programmes/card-programme-audit'
import { CardProgrammeForm } from './card-programmes/card-programme-form'

export interface CardProgrammesPageProps {
  currentUser: UserInfo
}

// Wrapper component to resolve programme by :id for Details page
const DetailsRouteWrapper: React.FC<{
  currentUser: UserInfo
  programmes: CardProgramme[]
  isLoading: boolean
  onToggleActive: (prog: CardProgramme) => void
}> = ({ currentUser, programmes, isLoading, onToggleActive }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const programmeId = id ? parseInt(id, 10) : null

  const programme = React.useMemo(() => {
    if (programmeId) {
      return programmes.find((p) => p.id === programmeId) || null
    }
    return null
  }, [programmes, programmeId])

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
        Loading Card Programme details...
      </div>
    )
  }

  if (!programme) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Card Programme #{id} Not Found
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          The requested card programme specification could not be located in the current tenant configuration.
        </p>
        <button
          onClick={() => navigate('/card-programmes')}
          className="mt-4 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          ← Return to Card Programmes List
        </button>
      </div>
    )
  }

  return (
    <CardProgrammeDetails
      programme={programme}
      currentUser={currentUser}
      onToggleActive={() => onToggleActive(programme)}
    />
  )
}

// Wrapper component to resolve programme by :id for child workspace routes
const ChildWorkspaceWrapper: React.FC<{
  currentUser: UserInfo
  programmes: CardProgramme[]
  isLoading: boolean
  childTab: 'segments' | 'charges' | 'references' | 'audit'
}> = ({ currentUser, programmes, isLoading, childTab }) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const programmeId = id ? parseInt(id, 10) : null

  const programme = React.useMemo(() => {
    if (programmeId) {
      return programmes.find((p) => p.id === programmeId) || null
    }
    return null
  }, [programmes, programmeId])

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
        Loading workspace data...
      </div>
    )
  }

  if (!programme) {
    return (
      <div className="p-12 text-center bg-white rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Card Programme #{id} Not Found
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          The parent card programme for this workspace could not be located.
        </p>
        <button
          onClick={() => navigate('/card-programmes')}
          className="mt-4 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          ← Return to Card Programmes List
        </button>
      </div>
    )
  }

  switch (childTab) {
    case 'segments':
      return <CardProgrammeSegments programme={programme} currentUser={currentUser} />
    case 'charges':
      return <CardProgrammeCharges programme={programme} currentUser={currentUser} />
    case 'references':
      return <CardProgrammeReferences programme={programme} currentUser={currentUser} />
    case 'audit':
      return <CardProgrammeAudit programme={programme} currentUser={currentUser} />
    default:
      return null
  }
}

export const CardProgrammesPage: React.FC<CardProgrammesPageProps> = ({ currentUser }) => {
  const { toast } = useToast()
  const [programmes, setProgrammes] = React.useState<CardProgramme[]>([])
  const [cardTypes, setCardTypes] = React.useState<CardType[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Toggle Active Dialog State
  const [toggleItem, setToggleItem] = React.useState<CardProgramme | null>(null)
  const [toggleRemarks, setToggleRemarks] = React.useState('')
  const [isToggling, setIsToggling] = React.useState(false)

  const isMakerOnly = currentUser.roles.includes('operations_admin_maker') && !currentUser.roles.includes('super_admin')

  // Fetch Card Types
  React.useEffect(() => {
    apiService.getCardTypes().then((types) => setCardTypes(types)).catch(() => {})
  }, [])

  // Fetch Master Data
  const fetchProgrammes = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiService.getCardProgrammes()
      const tenantFiltered = data.filter(
        (p) => p.client_id === currentUser.client_id || currentUser.roles.includes('super_admin')
      )
      setProgrammes(tenantFiltered)
    } catch {
      toast({
        title: 'Error Loading Card Programmes',
        description: 'Failed to retrieve card programme configurations.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentUser.client_id, currentUser.roles, toast])

  React.useEffect(() => {
    fetchProgrammes()
  }, [fetchProgrammes])

  // Handle Confirm Toggle Status
  const handleConfirmToggle = async () => {
    if (!toggleItem) return
    setIsToggling(true)
    try {
      if (isMakerOnly) {
        const workItem = await apiService.submitMakerCheckerWorkItem({
          entity_type: 'card_programmes',
          entity_id: toggleItem.id,
          operation: 'UPDATE',
          maker_remarks: toggleRemarks || `Toggle status to ${!toggleItem.active} for ${toggleItem.card_programme_name}`,
          payload: {
            ...toggleItem,
            active: !toggleItem.active,
          },
        })
        toast({
          title: 'Maker-Checker Item Submitted',
          description: `Status change for '${toggleItem.card_programme_name}' submitted for review (Work Item #${workItem.work_item_id}).`,
          variant: 'info',
        })
      } else {
        const updated = await apiService.toggleCardProgrammeStatus(toggleItem.id, !toggleItem.active, toggleItem)
        toast({
          title: updated.active ? 'Card Programme Activated' : 'Card Programme Deactivated',
          description: `Programme '${updated.card_programme_name}' is now ${updated.active ? 'active' : 'inactive'}.`,
          variant: updated.active ? 'success' : 'info',
        })
        fetchProgrammes()
      }
    } catch (err: any) {
      toast({
        title: 'Status Update Failed',
        description: err.message || 'Could not update programme active status.',
        variant: 'destructive',
      })
    } finally {
      setIsToggling(false)
      setToggleItem(null)
      setToggleRemarks('')
    }
  }

  return (
    <>
      <Routes>
        <Route
          path=""
          element={
            <CardProgrammesList
              currentUser={currentUser}
              cardProgrammes={programmes}
              cardTypes={cardTypes}
              isLoading={isLoading}
              onRefresh={fetchProgrammes}
              onDeleteProgramme={(prog) => setToggleItem(prog)}
            />
          }
        />

        <Route path="new" element={<CardProgrammeForm currentUser={currentUser} />} />

        <Route
          path=":id"
          element={
            <DetailsRouteWrapper
              currentUser={currentUser}
              programmes={programmes}
              isLoading={isLoading}
              onToggleActive={(prog) => setToggleItem(prog)}
            />
          }
        />

        <Route path=":id/edit" element={<CardProgrammeForm currentUser={currentUser} />} />

        <Route
          path=":id/segments"
          element={
            <ChildWorkspaceWrapper
              currentUser={currentUser}
              programmes={programmes}
              isLoading={isLoading}
              childTab="segments"
            />
          }
        />

        <Route
          path=":id/charges"
          element={
            <ChildWorkspaceWrapper
              currentUser={currentUser}
              programmes={programmes}
              isLoading={isLoading}
              childTab="charges"
            />
          }
        />

        <Route
          path=":id/references"
          element={
            <ChildWorkspaceWrapper
              currentUser={currentUser}
              programmes={programmes}
              isLoading={isLoading}
              childTab="references"
            />
          }
        />

        <Route
          path=":id/audit"
          element={
            <ChildWorkspaceWrapper
              currentUser={currentUser}
              programmes={programmes}
              isLoading={isLoading}
              childTab="audit"
            />
          }
        />
      </Routes>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog
        isOpen={!!toggleItem}
        onClose={() => setToggleItem(null)}
        onConfirm={handleConfirmToggle}
        title={toggleItem?.active ? 'Deactivate Card Programme?' : 'Activate Card Programme?'}
        description={`Are you sure you want to ${toggleItem?.active ? 'deactivate' : 'activate'} '${toggleItem?.card_programme_name}'? ${
          toggleItem?.active
            ? 'Deactivating this programme will prevent branch users from initiating new card requests for this product.'
            : 'Activating this programme will make it immediately available for eligibility validation.'
        }`}
        confirmText={toggleItem?.active ? 'Deactivate Programme' : 'Activate Programme'}
        variant={toggleItem?.active ? 'destructive' : 'primary'}
        isLoading={isToggling}
        remarksRequired={isMakerOnly}
        remarksValue={toggleRemarks}
        onRemarksChange={setToggleRemarks}
      />
    </>
  )
}
