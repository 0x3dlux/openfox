import { useState } from 'react'
import { useSessionStats } from '../../hooks/useSessionStats'
import { useGitStatus } from '../../hooks/useGitStatus'
import { useSessionStore } from '../../stores/session'
import { formatTime, formatSpeed } from '../../lib/format-stats'
import { StatsModal } from './StatsModal'
import { CriteriaProgressSummary } from '../shared/CriteriaProgressSummary'
import { BranchIcon } from '../shared/icons'
import { DiffViewer } from './DiffViewer'
import type { Message } from '@shared/types.js'

interface SummaryDisplayProps {
  summary: string | null
  messages: Message[]
}

export function SummaryDisplay({ summary, messages }: SummaryDisplayProps) {
  const [showStatsModal, setShowStatsModal] = useState(false)
  const stats = useSessionStats(messages)
  const { branch } = useGitStatus()
  const session = useSessionStore((state) => state.currentSession)

  return (
    <div className="flex flex-col">
      {/* AI Stats at the top */}
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

          {/* Stats Modal */}
          <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stats={stats} />
        </div>
      )}

      {/* Summary section */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Summary</h3>
        {summary ? (
          <p className="text-sm text-text-primary leading-relaxed">{summary}</p>
        ) : (
          <div className="text-text-muted text-sm text-center py-2">No summary yet</div>
        )}
      </div>

      {/* Progress section */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Progress</h3>
        <CriteriaProgressSummary criteria={session?.criteria ?? []} />
      </div>

      {/* Git branch */}
      {branch && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <BranchIcon />
          <span className="truncate text-text-secondary" title={branch}>
            {branch}
          </span>
        </div>
      )}

      {/* Diff viewer */}
      <DiffViewer />
    </div>
  )
}
