import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSessionStore, useIsRunning } from '../../stores/session'
import { useDisplaySettings } from '../../stores/settings'

import { type TurnStats } from '../../lib/types'
import type { Message } from '@shared/types.js'

import { SessionLayout } from '../layout/SessionLayout'
import { SessionHeader } from './SessionHeader'
import { TurnStatsModal } from './TurnStatsModal'
import { MessageList } from './MessageList'
import { ConnectionStatusBar } from '../shared/ConnectionStatusBar'
import { useAgentsStore } from '../../stores/agents'
import { useCommandsStore } from '../../stores/commands'
import { useWorkflowsStore } from '../../stores/workflows'
import { focusChatTextarea } from '../../lib/focusChatTextarea'
import { CommandsModal } from '../settings/CommandsModal'
import { WorkflowsModal } from '../settings/WorkflowsModal'
import { QuickActionModal } from '../QuickActionModal'
import { ChatInput } from './ChatInput'
import { shouldCaptureMessageSearchShortcut } from './message-search-shortcut'

import { groupMessages, type DisplayItem } from './groupMessages.js'
import { usePromptHistory } from '../../hooks/usePromptHistory.js'
import { useAutoScroll } from '@/hooks/useAutoScroll.ts'
import { useScrolledSend } from '@/hooks/useScrolledSend.ts'
import { useKeybindings, useBinding, useAgentSwitchingBindings } from '../../hooks/useKeybindings'

interface PlanPanelProps {
  criteriaSidebarOpen?: boolean
  onCriteriaSidebarToggle?: () => void
  rawMessages?: Message[]
  hiddenCount?: number
}

export function PlanPanel({
  criteriaSidebarOpen: externalCriteriaSidebarOpen,
  onCriteriaSidebarToggle,
  rawMessages: propRawMessages,
  hiddenCount: propHiddenCount,
}: PlanPanelProps = {}) {
  const criteriaSidebarOpen = externalCriteriaSidebarOpen ?? true
  const [input, setInput] = useState('')

  const [attachments, setAttachments] = useState<import('@shared/types.js').Attachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showCommandsModal, setShowCommandsModal] = useState(false)
  const [showWorkflowsModal, setShowWorkflowsModal] = useState(false)
  const [showQuickAction, setShowQuickAction] = useState(false)
  const [turnStatsModal, setTurnStatsModal] = useState<TurnStats | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  const session = useSessionStore((state) => state.currentSession)
  const storeMessages = useSessionStore((state) => state.messages)
  const sessions = useSessionStore((state) => state.sessions)
  const isRunning = useIsRunning()
  const stopGeneration = useSessionStore((state) => state.stopGeneration)

  const messages = propRawMessages ?? storeMessages

  const { maxVisibleItems } = useDisplaySettings()

  const agentDefaults = useAgentsStore((state) => state.defaults)
  const agentUserItems = useAgentsStore((state) => state.userItems)
  const topLevelAgents = [...agentDefaults, ...agentUserItems].filter((a) => !a.subagent)

  const { history, selectedIndex, showHistory, openHistory, closeHistory, navigateUp, navigateDown, selectCurrent } =
    usePromptHistory(messages, sessions, session?.id)

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ stats: TurnStats }>
      setTurnStatsModal(customEvent.detail.stats)
    }
    window.addEventListener('open-turn-stats', handler)
    return () => window.removeEventListener('open-turn-stats', handler)
  }, [])

  useEffect(() => {
    useWorkflowsStore.getState().fetchWorkflows()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (shouldCaptureMessageSearchShortcut(e)) {
        e.preventDefault()
        // Toggle sidebar and focus search input
        if (!criteriaSidebarOpen) {
          // Open sidebar and focus search
          onCriteriaSidebarToggle?.()
          setTimeout(() => {
            searchInputRef.current?.focus()
          }, 100)
        } else {
          // If sidebar is open, toggle focus between search and last focused element
          if (document.activeElement === searchInputRef.current) {
            // Focus back to last focused element
            lastFocusedElementRef.current?.focus()
          } else {
            // Focus search input
            searchInputRef.current?.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [criteriaSidebarOpen, onCriteriaSidebarToggle])

  // Track last focused element
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && e.target !== searchInputRef.current) {
        lastFocusedElementRef.current = e.target
      }
    }
    document.addEventListener('focusin', handleFocus)
    return () => document.removeEventListener('focusin', handleFocus)
  }, [])

  const previousDisplayItemsRef = useRef<DisplayItem[]>([])

  const { displayItems, hiddenCount: computedHiddenCount } = useMemo((): {
    displayItems: DisplayItem[]
    hiddenCount: number
  } => {
    const items = groupMessages(messages, previousDisplayItemsRef.current)
    previousDisplayItemsRef.current = items
    if (maxVisibleItems > 0 && items.length > maxVisibleItems) {
      return { displayItems: items.slice(-maxVisibleItems), hiddenCount: items.length - maxVisibleItems }
    }
    return { displayItems: items, hiddenCount: 0 }
  }, [messages, maxVisibleItems])

  const hiddenCount = propHiddenCount ?? computedHiddenCount

  const { isAutoScrollActive, setAutoScroll } = useAutoScroll(scrollContainerRef, session)
  const { sendMessage, launchWorkflow } = useScrolledSend(setAutoScroll)

  // Track topmost visible display item for conversation index highlighting
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const displayItemsRef = useRef(displayItems)
  displayItemsRef.current = displayItems

  // Scroll the main chat to a specific display item index
  const scrollToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= displayItems.length) return

      const element = document.querySelector(`[data-item-index="${index}"]`)
      if (!element) return

      const container = scrollContainerRef.current
      if (!container) return

      setAutoScroll(false)

      const elementTop = element.getBoundingClientRect().top + container.scrollTop
      const targetPosition = elementTop - container.clientHeight / 2

      const startScrollTop = container.scrollTop

      container.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      })

      setTimeout(() => {
        const currentScrollTop = container.scrollTop
        if (Math.abs(currentScrollTop - startScrollTop) < 1) {
          setActiveIndex(index)
        }
      }, 100)
    },
    [displayItems.length, scrollContainerRef, setAutoScroll],
  )

  const handleLaunchWorkflow = useCallback(
    (workflowId: string, subGroup?: string) => {
      launchWorkflow(undefined, undefined, workflowId, subGroup)
    },
    [launchWorkflow],
  )

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      const popupOpen = showQuickAction || showCommandsModal || showWorkflowsModal || turnStatsModal
      if (e.key === 'Escape' && isRunning && !popupOpen) {
        stopGeneration()
      }
      if (e.key === 'ScrollLock') {
        setAutoScroll(!isAutoScrollActive)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [
    isRunning,
    stopGeneration,
    isAutoScrollActive,
    showQuickAction,
    showCommandsModal,
    showWorkflowsModal,
    turnStatsModal,
  ])

  const keybindings = useKeybindings()
  useBinding(keybindings.quickAction, () => {
    setShowQuickAction(true)
  })

  useAgentSwitchingBindings(keybindings.agentSwitching, topLevelAgents, (agentId) => {
    useSessionStore.getState().switchMode(agentId)
  })

  const handleSelectWorkflow = (workflowId: string) => {
    const content = input.trim() ? input : undefined
    const atts = attachments.length > 0 ? attachments : undefined
    launchWorkflow(content, atts, workflowId)
    clearInput()
  }

  const handleSelectWorkflowWithSubGroup = (workflowId: string, subGroup: string) => {
    const content = input.trim() ? input : undefined
    const atts = attachments.length > 0 ? attachments : undefined
    launchWorkflow(content, atts, workflowId, subGroup)
    clearInput()
  }

  const clearInput = () => {
    setInput('')
    setAttachments([])
    if (session?.id) {
      localStorage.removeItem(`openfox:draft:${session.id}`)
    }
  }

  return (
    <>
      <SessionLayout
        criteriaSidebarOpen={criteriaSidebarOpen}
        onCriteriaSidebarToggle={onCriteriaSidebarToggle}
        messages={storeMessages}
        displayItems={displayItems}
        activeIndex={activeIndex}
        onNavigate={scrollToIndex}
      >
        <SessionHeader />

        {turnStatsModal && <TurnStatsModal stats={turnStatsModal} onClose={() => setTurnStatsModal(null)} />}
        <ConnectionStatusBar />

        <MessageList
          displayItems={displayItems}
          scrollContainerRef={scrollContainerRef}
          highlightedMessageId={null}
          onLaunchWorkflow={handleLaunchWorkflow}
          hiddenCount={hiddenCount}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          attachments={attachments}
          setAttachments={setAttachments}
          dragOver={dragOver}
          setDragOver={setDragOver}
          errorMessage={errorMessage}
          setErrorMessage={setErrorMessage}
          scrollContainerRef={scrollContainerRef}
          sessionId={session?.id}
          sessionMode={session?.mode}
          showHistory={showHistory}
          history={history}
          selectedIndex={selectedIndex}
          openHistory={openHistory}
          closeHistory={closeHistory}
          navigateUp={navigateUp}
          navigateDown={navigateDown}
          selectCurrent={selectCurrent}
          isAutoScrollActive={isAutoScrollActive}
          setAutoScroll={setAutoScroll}
          onOpenMessageSearch={() => {}}
          onOpenCommandsModal={() => setShowCommandsModal(true)}
          onOpenWorkflowsModal={() => setShowWorkflowsModal(true)}
          onSelectWorkflow={handleSelectWorkflow}
          onSelectWorkflowWithSubGroup={handleSelectWorkflowWithSubGroup}
          clearInput={clearInput}
        />
        <CommandsModal isOpen={showCommandsModal} onClose={() => setShowCommandsModal(false)} />
        <WorkflowsModal isOpen={showWorkflowsModal} onClose={() => setShowWorkflowsModal(false)} />
        <QuickActionModal
          isOpen={showQuickAction}
          onClose={() => setShowQuickAction(false)}
          onSearchMessages={() => {
            onCriteriaSidebarToggle?.()
            setTimeout(() => searchInputRef.current?.focus(), 100)
          }}
          isAutoScrollActive={isAutoScrollActive}
          onToggleAutoScroll={setAutoScroll}
          textareaContent={input}
          onCloseComplete={focusChatTextarea}
          onCloseCompleteAction={() => window.dispatchEvent(new CustomEvent('open-session-dropdown'))}
          onSelectCommand={async (commandId, textareaContent) => {
            const full = await useCommandsStore.getState().fetchCommand(commandId)
            if (full) {
              const combinedContent = textareaContent?.trim()
                ? `${textareaContent.trim()}\n\n${full.prompt}`
                : full.prompt
              if (full.metadata.agentMode) {
                useSessionStore.getState().switchMode(full.metadata.agentMode)
              }
              sendMessage(combinedContent, attachments?.length ? attachments : undefined, {
                messageKind: 'command',
                isSystemGenerated: true,
              })
              clearInput()
            }
          }}
          onSelectWorkflow={(workflowId) => {
            const content = input.trim() || undefined
            const atts = attachments.length > 0 ? attachments : undefined
            launchWorkflow(content, atts, workflowId)
            clearInput()
          }}
        />
      </SessionLayout>
    </>
  )
}

export { VisionFallbackItem } from './VisionFallbackItem'
