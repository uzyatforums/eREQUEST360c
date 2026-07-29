import * as React from 'react'
import { UserInfo } from './types'
import { apiService } from './services/api'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { Footer } from './components/layout/footer'
import { CommandPalette } from './components/layout/command-palette'
import { ToastProvider } from './components/ui/toast'
import { CardProgrammesPage } from './pages/card-programmes'

export function App() {
  const [currentUser, setCurrentUser] = React.useState<UserInfo>({
    user_id: 'admin',
    username: 'admin',
    client_id: 100,
    branch_code: '001',
    roles: ['branch_submitter', 'branch_authorizer', 'super_admin'],
  })

  const [activeRoute, setActiveRoute] = React.useState('/config/card-programmes')
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)

  React.useEffect(() => {
    apiService.getCurrentUser().then((user) => {
      setCurrentUser(user)
    })
  }, [])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col dark:bg-slate-950 font-sans">
        {/* Top Navigation Header */}
        <Header
          user={currentUser}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Middle Body Layout: Sidebar + Main Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeRoute={activeRoute}
            onNavigate={(route) => setActiveRoute(route)}
          />

          <main className="flex-1 p-6 overflow-y-auto max-w-7xl">
            {activeRoute === '/config/card-programmes' ? (
              <CardProgrammesPage currentUser={currentUser} />
            ) : (
              <div className="p-12 text-center bg-white rounded-lg border border-slate-200 shadow-2xs dark:bg-slate-900 dark:border-slate-800">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {activeRoute.replace('/', '').toUpperCase()} Module
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  This module design blueprint is defined in <code className="font-mono text-blue-600">docs/ui/wireframes/</code>.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setActiveRoute('/config/card-programmes')}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    ← Return to Card Programmes Reference Implementation
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Status Bar Footer */}
        <Footer />

        {/* Global Ctrl+K Command Search Overlay */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(route) => setActiveRoute(route)}
        />
      </div>
    </ToastProvider>
  )
}

export default App
