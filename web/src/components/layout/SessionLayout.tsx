import type { ReactNode } from 'react'
import { useSessionStore } from '../../stores/session'
import { useConfigStore } from '../../stores/config'
import { SummaryDisplay } from '../plan/SummaryDisplay'
import { ConversationIndex } from '../plan/ConversationIndex'
import { DevServerFooter } from '../plan/DevServerFooter'
import type { Message } from '@shared/types.js'
import type { DisplayItem } from '../plan/groupMessages'

interface SessionLayoutProps {
  children: ReactNode
  criteriaSidebarOpen?: boolean
  onCriteriaSidebarToggle?: () => void
  messages: Message[]
  displayItems?: DisplayItem[]
  activeIndex?: number
  onNavigate?: (index: number) => void
}

export function SessionLayout({
  children,
  criteriaSidebarOpen = true,
  onCriteriaSidebarToggle,
  messages,
  displayItems,
  activeIndex,
  onNavigate,
}: SessionLayoutProps) {
  const session = useSessionStore((state) => state.currentSession)
  const version = useConfigStore((state) => state.version)

  return (
    <div className="relative h-full overflow-hidden">
      {/* Backdrop - mobile only, when sidebar is open */}
      {criteriaSidebarOpen && (
        <div className="fixed md:hidden inset-0 bg-secondary/50 z-40" onClick={onCriteriaSidebarToggle} />
      )}

      {/* Main Content */}
      <div className="flex h-full">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-secondary">{children}</div>

        {/* Summary Sidebar - mobile: fixed overlay, desktop: flex item */}
        {criteriaSidebarOpen ? (
          <aside className="hidden md:block w-[320px] shrink-0 border-l border-border bg-secondary flex flex-col h-screen overflow-y-auto">
            {/* Summary and Progress */}
            <div className="flex-shrink-0 px-4 py-4">
              <SummaryDisplay summary={session?.summary ?? null} messages={messages} />
            </div>

            {/* Conversation Index - scrollable section */}
            {displayItems && (
              <div className="flex-1 min-h-0">
                <div className="px-4 flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-text-primary">History</h3>
                </div>
                <ConversationIndex displayItems={displayItems} activeIndex={activeIndex} onNavigate={onNavigate} />
              </div>
            )}

            {/* Dev Server - below conversation */}
            {session?.workdir && (
              <div className="flex-shrink-0 px-4 py-2 border-t border-border">
                <DevServerFooter workdir={session?.workdir} />
              </div>
            )}

            {/* Version footer - pinned to bottom */}
            {version && (
              <div className="flex-shrink-0 px-4 py-2 text-center text-xs text-text-muted border-t border-border">
                <a
                  href="https://github.com/co-l/openfox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent-primary transition-colors"
                >
                  OpenFox
                </a>
                {' - '}
                <span>v{version}</span>
              </div>
            )}
          </aside>
        ) : (
          <aside className="hidden md:block w-0 shrink-0 overflow-hidden border-l-0" />
        )}

        {/* Mobile sidebar - always rendered but conditionally visible */}
        <aside
          className={`
            md:hidden
            bg-secondary
            transition-all duration-300 ease-in-out
            fixed right-0 top-[32px] h-screen w-[320px] z-50 overflow-y-auto
            ${criteriaSidebarOpen ? 'translate-x-0 border-l border-border' : 'translate-x-full'}
          `}
        >
          <div className="flex flex-col">
            <div className="flex-shrink-0 px-4 py-4">
              <SummaryDisplay summary={session?.summary ?? null} messages={messages} />
            </div>
            {displayItems && (
              <div className="py-2 flex-1 min-h-0">
                <div className="px-4 flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-text-primary">History</h3>
                </div>
                <ConversationIndex displayItems={displayItems} activeIndex={activeIndex} onNavigate={onNavigate} />
              </div>
            )}
            <div className="flex-shrink-0 px-4 py-2 border-t border-border">
              <DevServerFooter workdir={session?.workdir} />
            </div>
            {version && (
              <div className="flex-shrink-0 px-4 py-2 text-center text-xs text-text-muted border-t border-border">
                <a
                  href="https://github.com/co-l/openfox"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent-primary transition-colors"
                >
                  OpenFox
                </a>
                {' - '}
                <span>v{version}</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
