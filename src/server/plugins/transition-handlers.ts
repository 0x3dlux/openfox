import type { PluginTransitionContext } from '../../plugin/index.js'

export type TransitionHandler = (context: PluginTransitionContext) => boolean | Promise<boolean>

const handlers = new Map<string, { pluginId: string; handler: TransitionHandler }>()

export function registerPluginTransitionHandler(pluginId: string, name: string, handler: TransitionHandler): void {
  handlers.set(name, { pluginId, handler })
}

export function unregisterPluginTransitionHandlers(pluginId: string): void {
  for (const [name, entry] of handlers) {
    if (entry.pluginId === pluginId) handlers.delete(name)
  }
}

export function getPluginTransitionHandler(name: string): TransitionHandler | undefined {
  return handlers.get(name)?.handler
}

export function listPluginTransitionHandlers(): { name: string; pluginId: string }[] {
  return [...handlers.entries()].map(([name, entry]) => ({ name, pluginId: entry.pluginId }))
}

export async function runPluginTransitionHandler(name: string, context: PluginTransitionContext): Promise<boolean> {
  const handler = handlers.get(name)?.handler
  if (!handler) return false
  try {
    return (await handler(context)) === true
  } catch {
    return false
  }
}

export function clearPluginTransitionHandlers(): void {
  handlers.clear()
}
