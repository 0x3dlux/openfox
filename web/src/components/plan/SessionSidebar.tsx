import { useState, useCallback, useEffect } from 'react'
import { useSessionStats } from '../../hooks/useSessionStats'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useConfigStore } from '../../stores/config'
import { useSessionStore } from '../../stores/session'
import { useDisplaySettings } from '../../stores/settings'
import { authFetch } from '../../lib/api'
import { formatTime, formatSpeed } from '../../lib/format-stats'
import { StatsModal } from './StatsModal'
import { MetadataEntries, MetadataSectionHeader } from '../shared/MetadataEntries'
import { CriteriaEditor } from './CriteriaEditor'
import { DevServerFooter } from './DevServerFooter'
import { BackgroundProcesses } from './BackgroundProcesses'
import { BranchIcon, ReloadIcon, SearchIcon } from '../shared/icons'
import { AutoUpdateModal } from '../AutoUpdateModal'
import { DiffViewer } from './DiffViewer'
import { ConversationIndex } from './ConversationIndex'
import type { Message } from '@shared/types.js'
import type { DisplayItem } from './groupMessages'
import { UserIcon, ThinkingIcon, EyeIcon } from '../shared/icons'

const FILTER_CATEGORIES = [
  { key: 'user', label: 'User prompts', icon: UserIcon },
  { key: 'thinking', label: 'Thinking', icon: ThinkingIcon },
  { key: 'response', label: 'Responses', icon: EyeIcon },
] as const

export type FilterKey = (typeof FILTER_CATEGORIES)[number]['key']

interface SessionSidebarProps {
  messages: Message[]
  workdir?: string
  displayItems?: DisplayItem[]
  activeIndex?: number
  onNavigate?: (index: number) => void
  historyMode?: 'plain' | 'fancy'
  sidebarScrollContainerRef?: React.RefObject<HTMLDivElement | null>
}

export function SessionSidebar({
  messages,
  workdir,
  displayItems,
  activeIndex,
  onNavigate,
  sidebarScrollContainerRef,
}: SessionSidebarProps) {
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['user', 'thinking', 'response']))
  useDisplaySettings()

  const stats = useSessionStats(messages)
  const { branch } = useGitStatus()
  const version = useConfigStore((state) => state.version)
  const session = useSessionStore((state) => state.currentSession)

  const toggleFilter = useCallback((key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const checkForUpdate = useCallback(async () => {
    setCheckingUpdate(true)
    try {
      const res = await fetch('/api/auto-update/check')
      if (res.ok) {
        const data = (await res.json()) as { isUpdateAvailable: boolean; current: string; latest: string }
        setUpdateAvailable(data.isUpdateAvailable)
      }
    } catch {
      // silently fail
    } finally {
      setCheckingUpdate(false)
    }
  }, [])

  useEffect(() => {
    checkForUpdate()
  }, [checkForUpdate])

  return (
    <div className="flex flex-col h-full">
      {/* AI Stats and Acceptance Criteria - sticky at top */}
      <div className="sticky top-0 z-20 bg-secondary">
        {/* AI Stats */}
        {stats && (
          <div className="mb-4">
            <button
              onClick={() => setShowStatsModal(true)}
              className="w-full flex items-center justify-center px-3 py-2 rounded bg-bg-tertiary hover:bg-bg-secondary transition-colors"
              title="View detailed response and call-level stats"
            >
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="text-text-secondary">{formatTime(stats.aiTime)}</span>
                <span className="w-px h-3 bg-border" />
                <span className="text-text-secondary">{formatSpeed(stats.avgPrefillSpeed)}</span>
                <span>pp</span>
                <span className="w-px h-3 bg-border" />
                <span className="text-text-secondary">{formatSpeed(stats.avgGenerationSpeed)}</span>
                <span>tg</span>
              </div>
            </button>

            <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stats={stats} />
          </div>
        )}

        {/* Acceptance Criteria */}
        <div className="mt-4">
          <MetadataSectionHeader entries={session?.metadataEntries?.['criteria'] ?? []} title="Acceptance Criteria" />
          {session && <CriteriaEditor entries={session?.metadataEntries?.['criteria'] ?? []} sessionId={session.id} />}
          {session && (session.metadataEntries?.['review_findings']?.length ?? 0) > 0 && (
            <div className="mt-6">
              <MetadataSectionHeader entries={session.metadataEntries!['review_findings']!} title="Review Findings" />
              <MetadataEntries
                entries={session.metadataEntries!['review_findings']!}
                onClearAll={async () => {
                  try {
                    await authFetch(`/api/sessions/${session.id}/review-findings`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ review_findings: [] }),
                    })
                  } catch (e) {
                    console.error('Failed to clear review findings:', e)
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline - independent scrollable container with min-height */}
      {displayItems ? (
        <div className="flex-1 flex flex-col min-h-[250px]">
          <div className="flex items-center gap-2 mt-2 mb-2">
            <h3 className="text-sm font-semibold text-text-primary">Timeline</h3>
            <div className="flex gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-1 rounded transition-colors ${
                  searchOpen
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                    : 'bg-bg-tertiary text-text-muted border border-border hover:text-text-secondary'
                }`}
                title="Search"
              >
                <SearchIcon className="w-3.5 h-3.5" />
              </button>
              {FILTER_CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const isActive = activeFilters.has(cat.key)
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => toggleFilter(cat.key)}
                    className={`p-1 rounded transition-colors ${
                      isActive
                        ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                        : 'bg-bg-tertiary text-text-muted border border-border hover:text-text-secondary'
                    }`}
                    title={cat.label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                )
              })}
            </div>
          </div>
          {searchOpen && (
            <div className="px-3 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search timeline..."
                className="w-full px-2 py-1 text-sm bg-bg-tertiary border border-border rounded focus:outline-none focus:border-accent-primary text-text-primary placeholder:text-text-muted"
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto" ref={sidebarScrollContainerRef}>
            <ConversationIndex
              displayItems={displayItems}
              activeIndex={activeIndex}
              onNavigate={onNavigate}
              searchOpen={searchOpen}
              searchQuery={searchQuery}
              activeFilters={activeFilters}
            />
          </div>
        </div>
      ) : (
        // Invisible spacer to push bottom content down when History is disabled
        <div className="flex-1 flex flex-col min-h-[250px]" />
      )}

      {/* Git branch, Diff, Dev Server, Background Processes - at bottom */}
      <div className="border-t border-border pt-3">
        {branch && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <BranchIcon />
            <span className="truncate text-text-secondary" title={branch}>
              {branch}
            </span>
          </div>
        )}

        {/* Diff viewer — between branch and dev server */}
        <DiffViewer />

        {/* Dev Server — below separator */}
        <DevServerFooter workdir={workdir} />

        {/* Background Processes */}
        <BackgroundProcesses sessionId={session?.id} />

        {/* Version footer */}
        {version && (
          <div className="mt-4 pt-4 border-t border-border text-center text-xs text-text-muted">
            <div className="flex items-center justify-center gap-1">
              <a
                href="https://github.com/co-l/openfox"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent-primary transition-colors"
              >
                OpenFox
              </a>
              {' - '}
              <span className="font-mono">v{version}</span>
              <button
                onClick={() => checkForUpdate()}
                disabled={checkingUpdate}
                className="p-0.5 rounded hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                title="Check for updates"
              >
                <ReloadIcon className={`w-3 h-3 ${checkingUpdate ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {updateAvailable && (
              <button onClick={() => setShowUpdateModal(true)} className="text-accent-primary hover:underline mt-1">
                Update OpenFox →
              </button>
            )}
          </div>
        )}

        <AutoUpdateModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} versionInfo={null} />
      </div>
    </div>
  )
}
