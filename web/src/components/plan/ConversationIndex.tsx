import { memo, useRef, useCallback, useEffect, useState } from 'react'
import type { DisplayItem } from './groupMessages'
import { SearchIcon, UserIcon, ThinkingIcon, AgentIcon } from '../shared/icons'
import {
  FILTER_CATEGORIES,
  type FilterKey,
  getPlainLabel,
  getItemCategory,
  filterDisplayItems,
} from '../../lib/conversation-utils'

interface ConversationIndexProps {
  displayItems: DisplayItem[]
  activeIndex?: number
  onNavigate?: (index: number) => void
  searchInputRef?: React.RefObject<HTMLInputElement | null>
}

export function ConversationIndex({ displayItems, activeIndex, onNavigate, searchInputRef }: ConversationIndexProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set(['user', 'thinking', 'response']))

  const isUserInteractingRef = useRef(false)
  const lastScrollTimeRef = useRef<number>(0)
  const scrollDebounceMs = 100
  const isScrollingRef = useRef(false)

  // Toggle filter
  const toggleFilter = (key: FilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Filter items
  const filteredItems = filterDisplayItems(displayItems, activeFilters, searchQuery)

  const handleScrollToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < filteredItems.length) {
        isUserInteractingRef.current = true
        const item = filteredItems[index]!
        const realIndex = displayItems.indexOf(item)
        if (realIndex >= 0) {
          onNavigate?.(realIndex)
        }

        setTimeout(() => {
          const element = document.querySelector(`[data-item-index="${realIndex}"]`)
          if (element) {
            element.classList.add('bg-accent-primary/20', 'ring-2', 'ring-accent-primary')
            setTimeout(() => {
              element.classList.remove('bg-accent-primary/20', 'ring-2', 'ring-accent-primary')
            }, 300)
          }
          isUserInteractingRef.current = false
        }, 600)
      }
    },
    [filteredItems, displayItems, onNavigate],
  )

  // Auto-scroll to active item
  const scrollToActiveItem = useCallback(() => {
    if (activeIndex === undefined || activeIndex < 0 || activeIndex >= displayItems.length) return
    if (isUserInteractingRef.current || isScrollingRef.current) return

    const now = Date.now()
    if (now - lastScrollTimeRef.current < scrollDebounceMs) return

    const element = itemRefs.current.get(activeIndex)
    const container = containerRef.current

    if (element && container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const containerHeight = container.clientHeight
      const containerScrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight

      const elementTopInContainer = elementRect.top - containerRect.top + containerScrollTop
      const elementHeight = elementRect.height
      const elementBottomInContainer = elementTopInContainer + elementHeight

      const visibleTop = containerScrollTop
      const visibleBottom = containerScrollTop + containerHeight

      const triggerZone = containerHeight * 0.1
      const isApproachingTopEdge = elementTopInContainer < visibleTop + triggerZone
      const isApproachingBottomEdge = elementBottomInContainer > visibleBottom - triggerZone

      if (isApproachingTopEdge || isApproachingBottomEdge) {
        isScrollingRef.current = true

        let targetScrollTop: number
        if (activeIndex === 0 && elementTopInContainer < 5) {
          targetScrollTop = 0
        } else if (activeIndex === displayItems.length - 1 && elementBottomInContainer > scrollHeight - 5) {
          targetScrollTop = scrollHeight - containerHeight
        } else {
          const elementCenter = elementTopInContainer + elementHeight / 2
          targetScrollTop = elementCenter - containerHeight / 2
        }

        const maxScroll = scrollHeight - containerHeight
        const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

        container.scrollTo({ top: clampedScrollTop, behavior: 'smooth' })
        lastScrollTimeRef.current = now

        setTimeout(() => {
          isScrollingRef.current = false
        }, 200)
      }
    }
  }, [activeIndex, displayItems.length])

  useEffect(() => {
    const mainChatContainer = document.querySelector('[data-testid="chat-scroll-container"]') as HTMLElement
    if (!mainChatContainer) return

    const checkMainChatScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainChatContainer
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10

      if (isAtBottom && containerRef.current) {
        const container = containerRef.current
        const maxScroll = container.scrollHeight - container.clientHeight
        if (Math.abs(container.scrollTop - maxScroll) > 1) {
          container.scrollTo({ top: maxScroll, behavior: 'smooth' })
        }
      }
    }

    mainChatContainer.addEventListener('scroll', scrollToActiveItem, { passive: true })
    mainChatContainer.addEventListener('scroll', checkMainChatScroll, { passive: true })
    scrollToActiveItem()

    return () => {
      mainChatContainer.removeEventListener('scroll', scrollToActiveItem)
      mainChatContainer.removeEventListener('scroll', checkMainChatScroll)
    }
  }, [scrollToActiveItem])

  function formatTime(timestamp: string): string {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffHours / 24

    if (diffHours < 24) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
    } else if (diffDays < 5) {
      if (diffHours < 48) {
        return `${Math.floor(diffHours)}h ago`
      }
      return `${Math.floor(diffDays)}d ago`
    } else {
      const date = new Date(timestamp)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }

  const getItemIcon = (item: DisplayItem) => {
    if (item.type !== 'message') return null
    const msg = item.message
    if (msg.role === 'assistant') {
      if (msg.thinkingContent?.trim() && !msg.content?.trim()) return <ThinkingIcon />
      return <AgentIcon />
    }
    if (msg.role === 'user') return <UserIcon />
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with search and filters */}
      <div className="flex items-center gap-2 mt-2 mb-2 flex-shrink-0">
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
            const isActive = activeFilters.has(cat.key as FilterKey)
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => toggleFilter(cat.key as FilterKey)}
                className={`p-1 rounded transition-colors ${
                  isActive
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40'
                    : 'bg-bg-tertiary text-text-muted border border-border hover:text-text-secondary'
                }`}
                title={cat.label}
              >
                {cat.key === 'user' && <UserIcon />}
                {cat.key === 'thinking' && <ThinkingIcon />}
                {cat.key === 'response' && <AgentIcon />}
              </button>
            )
          })}
        </div>
      </div>
      {searchOpen && (
        <div className="px-3 mb-2 flex-shrink-0">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search timeline..."
            className="w-full px-2 py-1 text-sm bg-bg-tertiary border border-border rounded focus:outline-none focus:border-accent-primary text-text-primary placeholder:text-text-muted"
          />
        </div>
      )}
      {/* Items list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="px-3 py-4 text-center text-text-muted text-sm">
            {activeFilters.size > 0 ? 'No matches' : 'No messages yet'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const realIndex = displayItems.indexOf(item)
            if (realIndex === -1) return null
            const category = getItemCategory(item)
            const isActive = activeIndex === realIndex
            const timestamp =
              item.type === 'message'
                ? item.message.timestamp
                : item.type === 'subagent'
                  ? item.messages[0]?.timestamp
                  : undefined
            const label = getPlainLabel(item)
            const icon = getItemIcon(item)
            const colorClass = category ? FILTER_CATEGORIES.find((c) => c.key === category)?.color : 'text-text-muted'

            return (
              <div
                key={`${realIndex}-${item.type}`}
                ref={(el) => {
                  if (el) {
                    itemRefs.current.set(realIndex, el)
                  }
                }}
                data-item-index={realIndex}
                onClick={() => handleScrollToIndex(realIndex)}
                className={`rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors mb-1 ${
                  isActive
                    ? 'bg-accent-primary/20 text-text-primary'
                    : category === 'user'
                      ? 'bg-accent-primary/5 text-text-secondary hover:bg-accent-primary/10 hover:text-text-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`flex-shrink-0 mt-0.5 ${colorClass}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-3">{label}</div>
                  </div>
                  {timestamp && (
                    <span className="text-text-muted text-xs flex-shrink-0 self-start">{formatTime(timestamp)}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export const MemoizedConversationIndex = memo(ConversationIndex)
