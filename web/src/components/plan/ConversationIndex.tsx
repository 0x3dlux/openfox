import { memo, useRef, useCallback, useEffect } from 'react'
import type { DisplayItem } from './groupMessages'
import { isUserNavigatingHistory } from '../../hooks/useAutoScroll'

export const FILTER_CATEGORIES = [
  { key: 'user', label: 'User prompts', color: 'text-orange-400' },
  { key: 'thinking', label: 'Thinking', color: 'text-cyan-300' },
  { key: 'response', label: 'Responses', color: 'text-lime-300' },
] as const

export type FilterKey = (typeof FILTER_CATEGORIES)[number]['key']

export function getItemCategory(item: DisplayItem): FilterKey | null {
  if (item.type !== 'message') return null
  const msg = item.message
  if (msg.role === 'user') return 'user'
  if (msg.role === 'assistant') {
    if (msg.thinkingContent?.trim() && !msg.content?.trim()) return 'thinking'
    if (msg.content?.trim()) return 'response'
    if (msg.thinkingContent?.trim()) return 'thinking'
  }
  return null
}

function getPlainLabel(item: DisplayItem): string {
  if (item.type === 'message') {
    const msg = item.message
    const rawContent = msg.content || ''
    const cleanContent = rawContent
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (msg.messageKind === 'workflow-started') {
      try {
        const data = JSON.parse(rawContent) as { workflowName: string }
        return `Workflow: ${data.workflowName}`
      } catch {
        return 'Workflow started'
      }
    }
    if (msg.messageKind === 'task-completed') return 'Task completed'
    if (msg.messageKind === 'auto-prompt') return 'Auto-prompt'
    if (msg.messageKind === 'correction') return 'Correction'
    if (msg.messageKind === 'context-reset') return 'Context reset'
    if (msg.messageKind === 'command') return 'Command executed'

    if (msg.role === 'assistant') {
      if (cleanContent) return cleanContent.slice(0, 200)
      if (msg.thinkingContent?.trim()) return msg.thinkingContent.slice(0, 200)
      return ''
    }
    const preview = cleanContent.slice(0, 200)
    return preview.length < cleanContent.length ? `${preview}...` : preview
  }
  if (item.type === 'subagent') return `Sub-agent: ${item.subAgentType}`
  return ''
}

interface ConversationIndexProps {
  displayItems: DisplayItem[]
  activeIndex?: number
  onNavigate?: (index: number) => void
  _historyMode?: 'plain' | 'fancy'
  searchOpen?: boolean
  searchQuery?: string
  activeFilters?: Set<FilterKey>
  _onNavigateToIndex?: (index: number) => void
}

export function ConversationIndex({
  displayItems,
  activeIndex,
  onNavigate,
  searchQuery = '',
  activeFilters = new Set(['user', 'thinking', 'response']),
}: ConversationIndexProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const isUserInteractingRef = useRef(false)
  const lastScrollTimeRef = useRef<number>(0)
  const scrollDebounceMs = 100
  const isScrollingRef = useRef(false)

  const filteredItems = useRef<DisplayItem[]>([])

  useEffect(() => {
    let result = displayItems.filter((item) => {
      if (item.type === 'context-divider') return false
      if (item.type === 'message') {
        if (item.message.messageKind === 'auto-prompt') return false
        if (item.message.role === 'assistant') {
          if (!item.message.content?.trim() && !item.message.thinkingContent?.trim()) return false
        }
      }
      return true
    })

    result = result.filter((item) => {
      const category = getItemCategory(item)
      if (category && !activeFilters.has(category)) return false
      return true
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        const label = getPlainLabel(item).toLowerCase()
        return label.includes(query)
      })
    }

    filteredItems.current = result
  }, [displayItems, searchQuery, Array.from(activeFilters).sort().join(',')])

  const handleScrollToIndex = useCallback(
    (index: number) => {
      const item = filteredItems.current[index]
      if (!item) return

      const realIndex = displayItems.indexOf(item)
      if (realIndex < 0 || realIndex >= displayItems.length) return

      isUserInteractingRef.current = true
      isUserNavigatingHistory.current = true

      onNavigate?.(realIndex)

      // Scroll the main chat to center the element
      const element = document.querySelector(`[data-item-index="${realIndex}"]`)
      if (element) {
        const container = document.querySelector('[data-scroll-container]') as HTMLElement
        if (container) {
          const elementRect = element.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()

          // Calculate the element's position relative to the container
          const elementTop = elementRect.top - containerRect.top + container.scrollTop
          const elementHeight = elementRect.height

          // Center the element in the viewport
          const targetScrollTop = elementTop - container.clientHeight / 2 + elementHeight / 2

          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth',
          })
        }
      }

      // Flash the element after scroll animation
      setTimeout(() => {
        const flashElement = document.querySelector(`[data-item-index="${realIndex}"]`)
        if (flashElement) {
          flashElement.classList.add('bg-accent-primary/20', 'ring-2', 'ring-accent-primary')
          setTimeout(() => {
            flashElement.classList.remove('bg-accent-primary/20', 'ring-2', 'ring-accent-primary')
          }, 300)
        }
        isUserInteractingRef.current = false
        isUserNavigatingHistory.current = false
      }, 500)
    },
    [onNavigate, displayItems],
  )

  const scrollToActiveItem = useCallback(() => {
    if (activeIndex === undefined || activeIndex < 0 || activeIndex >= displayItems.length) {
      return
    }

    if (isUserInteractingRef.current || isScrollingRef.current) {
      return
    }

    const now = Date.now()
    if (now - lastScrollTimeRef.current < scrollDebounceMs) {
      return
    }

    // Get the active item from displayItems (main chat)
    const activeItem = displayItems[activeIndex]
    if (!activeItem) return

    // Find this item in filteredItems to get its position in the sidebar
    const filteredIndex = filteredItems.current.indexOf(activeItem)

    const container = containerRef.current
    if (!container) return

    // If item is not in filtered list, find nearest visible item
    if (filteredIndex === -1) {
      // Find the closest visible item to the activeIndex
      let nearestFilteredIndex = -1
      let nearestDistance = Infinity

      filteredItems.current.forEach((filteredItem, idx) => {
        const realIndex = displayItems.indexOf(filteredItem)
        const distance = Math.abs(realIndex - activeIndex)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestFilteredIndex = idx
        }
      })

      if (nearestFilteredIndex === -1) return

      // Scroll to the nearest item
      const nearestItem = filteredItems.current[nearestFilteredIndex]!
      const nearestElement = itemRefs.current.get(displayItems.indexOf(nearestItem))
      if (!nearestElement) return

      const containerRect = container.getBoundingClientRect()
      const elementRect = nearestElement.getBoundingClientRect()
      const containerHeight = container.clientHeight
      const containerScrollTop = container.scrollTop
      const elementTopInContainer = elementRect.top - containerRect.top + containerScrollTop
      const elementHeight = nearestElement.clientHeight

      const elementCenter = elementTopInContainer + elementHeight / 2
      const targetScrollTop = elementCenter - containerHeight / 2
      const maxScroll = container.scrollHeight - containerHeight
      const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

      container.scrollTo({ top: clampedScrollTop, behavior: 'smooth' })
      lastScrollTimeRef.current = now
      setTimeout(() => {
        isScrollingRef.current = false
      }, 200)
      return
    }

    // Item is in filtered list - scroll to keep it visible
    const element = itemRefs.current.get(activeIndex)

    if (element && container) {
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()

      const containerHeight = container.clientHeight
      const containerScrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight

      const elementTopInContainer = elementRect.top - containerRect.top + containerScrollTop
      const elementHeight = elementRect.height

      const visibleTop = containerScrollTop
      const visibleBottom = containerScrollTop + containerHeight

      // Check if element is outside the visible area
      const isOutsideTop = elementTopInContainer < visibleTop
      const isOutsideBottom = elementTopInContainer + elementHeight > visibleBottom

      if (isOutsideTop || isOutsideBottom) {
        const elementCenter = elementTopInContainer + elementHeight / 2
        const targetScrollTop = elementCenter - containerHeight / 2
        const maxScroll = scrollHeight - containerHeight
        const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll))

        isScrollingRef.current = true
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
      if (msg.thinkingContent?.trim() && !msg.content?.trim()) return '💡'
      return '📄'
    }
    if (msg.role === 'user') return '👤'
    return null
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredItems.current.length === 0 ? (
        <div className="px-3 py-4 text-center text-text-muted text-sm">
          {activeFilters.size > 0 ? 'No matches' : 'No messages yet'}
        </div>
      ) : (
        filteredItems.current.map((item, index) => {
          const realIndex = displayItems.indexOf(item)
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
              key={`${index}-${item.type}-${realIndex}`}
              ref={(el) => {
                if (el && realIndex >= 0) {
                  itemRefs.current.set(realIndex, el)
                }
              }}
              data-item-index={realIndex}
              onClick={() => handleScrollToIndex(index)}
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
  )
}

export const MemoizedConversationIndex = memo(ConversationIndex)
