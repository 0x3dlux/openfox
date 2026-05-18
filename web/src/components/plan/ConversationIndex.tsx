import { memo, useRef, useCallback, useEffect } from 'react'
import type { DisplayItem } from './groupMessages'

interface ConversationIndexProps {
  displayItems: DisplayItem[]
  activeIndex?: number
  onNavigate?: (index: number) => void
}

// Format timestamp to relative time string
function formatTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffHours / 24

  if (diffHours < 24) {
    // Less than 24 hours: show time
    const date = new Date(timestamp)
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  } else if (diffDays < 5) {
    // 1-5 days: show hours/days ago
    if (diffHours < 48) {
      return `${Math.floor(diffHours)}h ago`
    }
    return `${Math.floor(diffDays)}d ago`
  } else {
    // 5+ days: show date
    const date = new Date(timestamp)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
}

export function ConversationIndex({ displayItems, activeIndex, onNavigate }: ConversationIndexProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const scrollToIndex = useCallback(
    (index: number, behavior: 'smooth' | 'auto' = 'smooth') => {
      let element = itemRefs.current.get(index)
      const container = containerRef.current

      // If element not found (skipped item), try to find the next rendered item
      if (!element && container) {
        for (let i = index + 1; i < displayItems.length; i++) {
          element = itemRefs.current.get(i)
          if (element) break
        }
      }

      if (element && container) {
        const elementRect = element.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()

        // Calculate element's position relative to the container
        const elementTopInContainer = elementRect.top - containerRect.top + container.scrollTop
        const elementHeight = element.clientHeight
        const containerHeight = container.clientHeight

        // Calculate target scroll position to center the element
        const targetScrollTop = elementTopInContainer - containerHeight / 2 + elementHeight / 2

        // Clamp to valid range [0, maxScroll]
        const maxScroll = container.scrollHeight - containerHeight
        const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

        container.scrollTo({ top: clampedScrollTop, behavior })
      }
    },
    [displayItems.length],
  )

  const handleScrollToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < displayItems.length) {
        // Notify parent to scroll the main chat to this item
        onNavigate?.(index)

        const container = containerRef.current
        if (!container) return

        // Scroll the conversation index to center the item immediately
        scrollToIndex(index, 'smooth')
      }
    },
    [onNavigate, scrollToIndex, displayItems.length],
  )

  // Auto-scroll conversation index to keep active item centered
  useEffect(() => {
    if (activeIndex === undefined || activeIndex < 0 || activeIndex >= displayItems.length) {
      return
    }

    const element = itemRefs.current.get(activeIndex)
    const container = containerRef.current

    if (element && container) {
      const elementRect = element.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const containerHeight = container.clientHeight
      const currentScrollTop = container.scrollTop
      const containerCenter = currentScrollTop + containerHeight / 2

      // Calculate element's position relative to the container
      const elementTopInContainer = elementRect.top - containerRect.top + currentScrollTop
      const elementHeight = element.clientHeight
      const elementCenter = elementTopInContainer + elementHeight / 2

      // Check if element center is significantly off from container center
      const distance = Math.abs(elementCenter - containerCenter)

      // Only scroll if off-center by more than 5px
      if (distance > 5) {
        scrollToIndex(activeIndex, 'auto')
      }
    }
  }, [activeIndex, displayItems.length, scrollToIndex])

  const isItemActive = (index: number): boolean => {
    return activeIndex === index
  }

  const getItemLabel = (item: DisplayItem, index: number): string => {
    if (item.type === 'message') {
      const msg = item.message
      // Strip all HTML tags and normalize whitespace for all messages
      const rawContent = msg.content || ''
      const cleanContent = rawContent
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      const lowerContent = cleanContent.toLowerCase()

      // Check for specific patterns first (before role-based handling)
      if (lowerContent.startsWith('# build mode') || lowerContent.startsWith('build mode')) {
        return 'Builder'
      }
      if (lowerContent.startsWith('# plan mode') || lowerContent.startsWith('plan mode')) {
        return 'Planner'
      }
      if (
        lowerContent.includes('compaction') ||
        lowerContent.includes('compacted') ||
        lowerContent.includes('context window')
      ) {
        return 'Compaction'
      }

      if (msg.role === 'user') {
        return cleanContent.slice(0, 50) || '(attachment)'
      }
      if (msg.role === 'assistant') {
        // Show thinking content if available, otherwise show regular content
        if (msg.thinkingContent?.trim()) {
          const preview = msg.thinkingContent.slice(0, 50)
          return `${preview}${msg.thinkingContent.length > 50 ? '...' : ''}`
        }
        if (cleanContent) {
          const text = cleanContent.slice(0, 50)
          return `${text}${text.length > 50 ? '...' : ''}`
        }
        return ''
      }
      return `Message ${index + 1}`
    }
    if (item.type === 'context-divider') {
      return `Earlier context (${item.windowSequence})`
    }
    if (item.type === 'subagent') {
      return `Sub-agent: ${item.subAgentType}`
    }
    if (item.type === 'criteria-batch') {
      return 'Criteria updated'
    }
    return `Item ${index + 1}`
  }

  return (
    <div ref={containerRef} className="overflow-y-auto" style={{ height: '36vh' }}>
      {displayItems.map((item, index) => {
        const isActive = isItemActive(index)
        const isCriteria = item.type === 'criteria-batch'
        const isAssistant = item.type === 'message' && item.message.role === 'assistant'
        const hasThinking = isAssistant && item.message.thinkingContent?.trim()
        const hasContent = isAssistant && item.message.content?.trim()
        // Thinking messages: have thinking content, may or may not have regular content
        const isThinking = isAssistant && hasThinking && !hasContent
        const isSystemReminder = item.type === 'message' && item.message.content?.includes('<system-reminder>')
        const isBuildMode = isSystemReminder && item.message.content?.includes('# Build Mode')
        const isPlanMode = isSystemReminder && item.message.content?.includes('# Plan Mode')
        const isCompaction =
          item.type === 'message' &&
          (item.message.content?.toLowerCase().includes('compacted') ||
            item.message.content?.toLowerCase().includes('compaction') ||
            item.message.content?.toLowerCase().includes('context window'))
        const isEmptyAssistant = isAssistant && !hasContent && !hasThinking

        // Skip rendering empty assistant messages and context dividers
        if (isEmptyAssistant || item.type === 'context-divider') {
          return null
        }

        // Get timestamp for datetime display
        let timestamp: string | undefined
        if (item.type === 'message') {
          timestamp = item.message.timestamp
        } else if (item.type === 'subagent') {
          // Use the first message's timestamp for subagent groups
          timestamp = item.messages[0]?.timestamp
        }

        // Determine text color based on item type - using distinctly different colors
        let textColorClass = 'text-text-muted'
        if (isCompaction) {
          textColorClass = 'text-gray-400'
        } else if (item.type === 'message' && item.message.role === 'user' && !isSystemReminder) {
          textColorClass = 'text-orange-400'
        } else if (isThinking) {
          textColorClass = 'text-cyan-300'
        } else if (isAssistant && !isSystemReminder) {
          textColorClass = 'text-lime-300'
        } else if (isBuildMode) {
          textColorClass = 'text-sky-400'
        } else if (isPlanMode) {
          textColorClass = 'text-violet-400'
        } else if (isSystemReminder) {
          textColorClass = 'text-yellow-400'
        } else if (item.type === 'subagent') {
          textColorClass = 'text-amber-500'
        } else if (isCriteria) {
          textColorClass = 'text-green-400'
        }

        return (
          <div
            key={index}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(index, el)
              }
            }}
            data-item-index={index}
            onClick={() => handleScrollToIndex(index)}
            className={`
              px-4 py-1.5 rounded cursor-pointer text-xs transition-colors hover:bg-bg-tertiary mb-0.5
              ${isActive ? 'bg-accent-primary/25' : ''}
              ${isCompaction ? 'text-gray-400' : textColorClass}
            `}
            title={getItemLabel(item, index)}
          >
            <div className="flex items-center">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {item.type === 'message' && item.message.role === 'user' && !isSystemReminder && !isCompaction && (
                  <span className="text-orange-400 w-4 text-center flex-shrink-0">🤔</span>
                )}
                {isThinking && <span className="text-cyan-300 w-4 text-center flex-shrink-0">🧠</span>}
                {item.type === 'message' && item.message.role === 'assistant' && !isThinking && !isSystemReminder && (
                  <span className="text-lime-300 w-4 text-center flex-shrink-0">🤖</span>
                )}
                {isBuildMode && <span className="text-sky-400 w-4 text-center flex-shrink-0">🔨</span>}
                {isPlanMode && <span className="text-violet-400 w-4 text-center flex-shrink-0">📋</span>}
                {isSystemReminder && !isBuildMode && !isPlanMode && !isCompaction && (
                  <span className="text-yellow-400 w-4 text-center flex-shrink-0">⚙️</span>
                )}
                {isCompaction && <span className="text-orange-500 w-4 text-center flex-shrink-0">🗜️</span>}
                {item.type === 'subagent' && <span className="text-amber-500 w-4 text-center flex-shrink-0">◈</span>}
                {item.type === 'criteria-batch' && (
                  <span className="text-green-400 w-4 text-center flex-shrink-0">✅</span>
                )}

                <span className={`truncate ${textColorClass}`}>{getItemLabel(item, index)}</span>
              </div>
              {timestamp && (
                <span
                  className={`text-xs w-16 flex-shrink-0 text-right ${isActive ? 'text-accent-primary' : 'text-text-muted'}`}
                >
                  {formatTime(timestamp)}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const MemoizedConversationIndex = memo(ConversationIndex)
