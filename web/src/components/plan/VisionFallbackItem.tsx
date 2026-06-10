import { useState, memo } from 'react'
import { Markdown } from '../shared/Markdown.js'

export interface VisionFallbackItemProps {
  item: { type: 'start' | 'done'; messageId: string; attachmentId: string; filename?: string; description?: string }
}

export const VisionFallbackItem = memo(function VisionFallbackItem({ item }: VisionFallbackItemProps) {
  const [expanded, setExpanded] = useState(false)

  if (item.type === 'start') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300 text-sm">
        <span className="animate-pulse">●</span>
        <span>Delegating image to fallback vision model...</span>
        {item.filename && <span className="text-amber-400/70">({item.filename})</span>}
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-accent-success/10 border border-accent-success/30 rounded">
      <span className="text-accent-success">✓</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-accent-success text-sm">Image description done</span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        </div>
        {expanded && item.description && (
          <div className="mt-2 text-xs prose prose-invert prose-sm max-w-none">
            <Markdown content={item.description} />
          </div>
        )}
      </div>
    </div>
  )
})
