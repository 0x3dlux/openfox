export function parseAllowedTools(tools: string[]): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  for (const entry of tools) {
    const colonIdx = entry.indexOf(':')
    if (colonIdx === -1) {
      result.set(entry, new Set())
    } else {
      const toolName = entry.slice(0, colonIdx)
      const actionsStr = entry.slice(colonIdx + 1)
      const actions = actionsStr.split(',').filter(Boolean)
      result.set(toolName, new Set(actions))
    }
  }
  return result
}

export function serializeTools(granular: Map<string, Set<string>>): string[] {
  const result: string[] = []
  for (const [toolName, actions] of granular) {
    if (actions.size === 0) {
      result.push(toolName)
    } else {
      result.push(`${toolName}:${[...actions].join(',')}`)
    }
  }
  return result
}
