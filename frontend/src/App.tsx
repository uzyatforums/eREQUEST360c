import * as React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth-context'
import { LoginPage } from './pages/login'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { Footer } from './components/layout/footer'
import { CommandPalette } from './components/layout/command-palette'
import { ToastProvider } from './components/ui/toast'
import { CardProgrammesPage } from './pages/card-programmes'
import { CardSegmentsPage } from './pages/card-segments'
import { MakerCheckerPage } from './pages/maker-checker'
import { CardChargesList } from './pages/card-charges/card-charges-list'
import { CardChargeDetails } from './pages/card-charges/card-charge-details'
import { CardChargeForm } from './pages/card-charges/card-charge-form'
import { CardSegmentProgrammeChargesList } from './pages/card-segment-programme-charges/card-segment-programme-charges-list'
import { CardSegmentProgrammeChargeDetails } from './pages/card-segment-programme-charges/card-segment-programme-charge-details'
import { CardSegmentProgrammeChargeForm } from './pages/card-segment-programme-charges/card-segment-programme-charge-form'
import { WorkQueueProvider } from './context/work-queue-context'
import { Loader2 } from 'lucide-react'

function ModulePlaceholder() {
  const location = useLocation()
  const navigate = useNavigate()
  const moduleName = location.pathname.replace('/', '').toUpperCase() || 'UNKNOWN'

  return (
    <div className="p-12 text-center bg-white rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {moduleName} Module
      </h3>
      <p className="text-xs text-slate-500 mt-1">
        This module design blueprint is defined in <code className="font-mono text-blue-600">docs/ui/wireframes/</code>.
      </p>
      <div className="mt-6">
        <button
          onClick={() => navigate('/card-programmes')}
          className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
        >
          ← Return to Card Programmes Reference Implementation
        </button>
      </div>
    </div>
  )
}

function MainContent() {
  const { currentUser, isAuthenticated, isLoading } = useAuth()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold tracking-wide">eREQUEST360 Security</p>
          <p className="text-xs text-slate-400">Verifying JWT authentication and user session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage />
  }

  if (location.pathname === '/login') {
    return <Navigate to="/card-programmes" replace />
  }

  return (
    <WorkQueueProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col dark:bg-slate-950 font-sans">
        {/* Top Navigation Header */}
        <Header onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

        {/* Middle Body Layout: Sidebar + Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />

          <main className="flex-1 p-6 overflow-y-auto w-full">
            <Routes>
              <Route path="/" element={<Navigate to="/card-programmes" replace />} />
              <Route path="/card-programmes/*" element={<CardProgrammesPage currentUser={currentUser} />} />
              <Route path="/card-segments/*" element={<CardSegmentsPage currentUser={currentUser} />} />
              <Route path="/maker-checker/*" element={<MakerCheckerPage currentUser={currentUser} />} />
              <Route path="/card-charges" element={<CardChargesList />} />
              <Route path="/config/charges" element={<Navigate to="/card-charges" replace />} />
              <Route path="/card-charges/new" element={<CardChargeForm />} />
              <Route path="/card-charges/:id" element={<CardChargeDetails />} />
              <Route path="/card-charges/:id/edit" element={<CardChargeForm />} />

              {/* Card Segment Programme Charges */}
              <Route path="/card-segment-programme-charges" element={<CardSegmentProgrammeChargesList />} />
              <Route path="/config/card-segment-programme-charges" element={<Navigate to="/card-segment-programme-charges" replace />} />
              <Route path="/card-segment-programme-charges/new" element={<CardSegmentProgrammeChargeForm />} />
              <Route path="/card-segment-programme-charges/:id" element={<CardSegmentProgrammeChargeDetails />} />
              <Route path="/card-segment-programme-charges/:id/edit" element={<CardSegmentProgrammeChargeForm />} />
              <Route path="*" element={<ModulePlaceholder />} />
            </Routes>
          </main>
        </div>

        {/* Status Bar Footer */}
        <Footer />

        {/* Global Ctrl+K Command Search Overlay */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
        />
      </div>
    </WorkQueueProvider>
  )
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <MainContent />
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
