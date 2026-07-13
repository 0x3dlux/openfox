import type { DisplayItem } from '../components/plan/groupMessages'

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

export function getPlainLabel(item: DisplayItem): string {
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

export function filterDisplayItems(
  displayItems: DisplayItem[],
  activeFilters: Set<FilterKey>,
  searchQuery?: string,
): DisplayItem[] {
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

  if (searchQuery?.trim()) {
    const query = searchQuery.toLowerCase()
    result = result.filter((item) => {
      const label = getPlainLabel(item).toLowerCase()
      return label.includes(query)
    })
  }

  return result
}
