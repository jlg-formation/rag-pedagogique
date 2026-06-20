import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useSettingsStore } from '../../stores/settingsStore'
import { ApiKeyModal } from '../settings/ApiKeyModal'
import { clearAllData } from '../../db/client'

export function AppShell() {
  const { apiKey } = useSettingsStore()
  const [showSettings, setShowSettings] = useState(!apiKey)
  const [clearing, setClearing] = useState(false)

  async function handleClear() {
    if (!confirm('Supprimer tous les documents et embeddings indexés ?')) return
    setClearing(true)
    await clearAllData()
    setClearing(false)
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showSettings && (
        <ApiKeyModal onClose={() => setShowSettings(false)} />
      )}

      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <span className="text-lg font-bold text-gray-900">
              RAG Pédagogique
            </span>
          </div>

          <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
              { to: '/', label: '📄 Indexation' },
              { to: '/query', label: '💬 Requête' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={clearing}
              title="Vider la base vectorielle"
              className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-red-600"
            >
              {clearing ? '...' : '🗑 Vider'}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <span
                className={clsx(
                  'h-2 w-2 rounded-full',
                  apiKey ? 'bg-green-500' : 'bg-red-500',
                )}
              />
              <span className="text-gray-600">
                {apiKey ? 'API configurée' : 'Configurer API'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
