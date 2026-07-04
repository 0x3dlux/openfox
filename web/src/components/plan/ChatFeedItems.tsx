import type { DisplayItem } from './groupMessages.js'
import type { MetadataEntry } from '@shared/types.js'
import { ChatMessage } from './ChatMessage'
import { AssistantMessage } from './AssistantMessage'
import { SubAgentContainer } from './SubAgentContainer'
import { CriteriaGroupDisplay } from '../shared/CriteriaGroupDisplay'

interface ChatFeedItemsProps {
  displayItems: DisplayItem[]
  highlightedMessageId?: string | null
  sessionId?: string | null
  criteria?: MetadataEntry[]
  showThinking?: boolean
  showVerboseToolOutput?: boolean
  showStats?: boolean
  showAgentDefinitions?: boolean
  showWorkflowBars?: boolean
}

export function ChatFeedItems({
  displayItems,
  highlightedMessageId = null,
  sessionId,
  criteria = [],
  showThinking = true,
  showVerboseToolOutput = true,
  showStats = true,
  showAgentDefinitions = true,
  showWorkflowBars = true,
}: ChatFeedItemsProps) {
  return (
    <>
      {displayItems.map((item, index) => {
        if (item.type === 'context-divider') {
          return (
            <div key={index} data-item-index={index} className="flex items-center gap-2 feed-item px-2 md:px-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] text-text-muted font-medium px-2">Earlier context summarized</span>
              <div className="flex-1 border-t border-border" />
            </div>
          )
        }

        if (item.type === 'subagent') {
          const groupIsStreaming = item.messages.some((m) => m.isStreaming)
          return (
            <div key={index} data-item-index={index} className="px-2 md:px-4">
              <SubAgentContainer
                messages={item.messages}
                subAgentType={item.subAgentType}
                subAgentId={item.subAgentId}
                isStreaming={groupIsStreaming}
              />
            </div>
          )
        }

        if (item.type === 'criteria-batch') {
          return (
            <div key={index} data-item-index={index} className="feed-item px-2 md:px-4">
              <CriteriaGroupDisplay toolCalls={item.toolCalls} criteria={criteria} />
            </div>
          )
        }

        const message = item.message
        if (message.role === 'assistant') {
          return (
            <div key={index} data-item-index={index} className="px-2 md:px-4">
              <AssistantMessage
                message={message}
                showStats={showStats}
                showThinking={showThinking}
                showVerboseToolOutput={showVerboseToolOutput}
              />
            </div>
          )
        }

        const skipAutoPrompt = !showAgentDefinitions && message.messageKind === 'auto-prompt'
        const skipWorkflow =
          !showWorkflowBars && (message.messageKind === 'workflow-started' || message.messageKind === 'task-completed')
        if (skipAutoPrompt || skipWorkflow) {
          return null
        }

        return (
          <div key={index} data-item-index={index} className="px-2 md:px-4">
            <div
              data-message-id={message.id}
              className={highlightedMessageId === message.id ? 'rounded animate-highlight-fade' : undefined}
            >
              <ChatMessage
                message={message}
                messageIndex={index}
                sessionId={sessionId ?? undefined}
                isLastAssistantMessage={false}
              />
            </div>
          </div>
        )
      })}
    </>
  )
}
