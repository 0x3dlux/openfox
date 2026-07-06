import type { Message, ToolCall } from '@shared/types.js'

export type { Message, ToolCall }

// Display item: either a single message, a grouped sub-agent run, or a context window divider
export type DisplayItem =
  | { type: 'message'; message: Message }
  | { type: 'subagent'; subAgentId: string; subAgentType: string; messages: Message[] }
  | { type: 'context-divider'; windowSequence: number }

/**
 * Group messages into display items, collapsing consecutive sub-agent messages
 * and inserting context window dividers.
 *
 * This function preserves object identity for unchanged display items when given
 * a previousItems array, allowing React's memo() to skip unnecessary re-renders.
 */
export function groupMessages(messages: Message[], previousItems: DisplayItem[] = []): DisplayItem[] {
  const items: DisplayItem[] = []
  let currentSubAgentGroup: { subAgentId: string; subAgentType: string; messages: Message[] } | null = null
  let lastContextWindowId: string | undefined
  let windowSequence = 1

  // Create a map of message IDs to previous display items for identity preservation
  const previousItemsByMessageId = new Map<string, DisplayItem>()
  const previousItemsBySubAgentId = new Map<string, DisplayItem>()

  for (const item of previousItems) {
    if (item.type === 'message') {
      previousItemsByMessageId.set(item.message.id, item)
    } else if (item.type === 'subagent') {
      previousItemsBySubAgentId.set(item.subAgentId, item)
    }
  }

  const flushSubAgentGroup = () => {
    if (!currentSubAgentGroup) return

    const group = currentSubAgentGroup

    // Try to find a previous sub-agent item with the same ID
    const previousSubAgentItem = previousItemsBySubAgentId.get(group.subAgentId)

    // Check if all messages in the group are the same (by ID)
    const messagesMatch =
      previousSubAgentItem &&
      previousSubAgentItem.type === 'subagent' &&
      previousSubAgentItem.messages.length === group.messages.length &&
      previousSubAgentItem.messages.every((m, i) => m === group.messages[i])

    if (messagesMatch) {
      // Reuse the previous item
      items.push(previousSubAgentItem)
    } else {
      // Create new item
      items.push({
        type: 'subagent',
        subAgentId: group.subAgentId,
        subAgentType: group.subAgentType,
        messages: group.messages,
      })
    }

    currentSubAgentGroup = null
  }

  for (const msg of messages) {
    // Skip tool messages - they're displayed within assistant messages
    if (msg.role === 'tool') continue

    // Detect context window boundary - insert divider when window changes
    // Only insert if we've seen a previous window (not for the first window)
    if (msg.contextWindowId && lastContextWindowId && msg.contextWindowId !== lastContextWindowId) {
      flushSubAgentGroup()
      windowSequence++
      items.push({ type: 'context-divider', windowSequence })
    }
    lastContextWindowId = msg.contextWindowId

    if (msg.subAgentId && msg.subAgentType) {
      // Part of a sub-agent run
      if (currentSubAgentGroup && currentSubAgentGroup.subAgentId === msg.subAgentId) {
        // Add to existing group
        currentSubAgentGroup.messages.push(msg)
      } else {
        // Start new group
        flushSubAgentGroup()
        currentSubAgentGroup = { subAgentId: msg.subAgentId, subAgentType: msg.subAgentType!, messages: [msg] }
      }
    } else {
      // Regular message - flush any pending group
      flushSubAgentGroup()

      // Try to find a previous item for this message
      const previousItem = previousItemsByMessageId.get(msg.id)

      if (previousItem && previousItem.type === 'message' && previousItem.message === msg) {
        // Reuse the previous item (message reference is identical)
        items.push(previousItem)
      } else {
        // Create new item
        items.push({ type: 'message', message: msg })
      }
    }
  }

  // Flush final group
  flushSubAgentGroup()

  return items
}
