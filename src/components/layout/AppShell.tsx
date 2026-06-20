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
            <a
              href="https://github.com/jlg-formation/rag-pedagogique"
              target="_blank"
              rel="noopener noreferrer"
              title="Code source sur GitHub"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-label="GitHub">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
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
