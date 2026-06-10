import { useSessionStore } from './store'

export function useIsRunning() {
  return useSessionStore((state) => state.currentSession?.isRunning ?? false)
}

export function useQueuedMessages() {
  return useSessionStore((state) => state.queuedMessages)
}

export function useAbortInProgress() {
  return useSessionStore((state) => state.abortInProgress)
}

export function useVisionFallbackItems() {
  return useSessionStore((state) => state.visionFallbackByMessage)
}

export function useVisionFallbackForMessage(messageId: string, attachmentId?: string) {
  return useSessionStore((state) => {
    if (!attachmentId) return undefined
    const key = `${messageId}-${attachmentId}`
    return state.visionFallbackByMessage[key]
  })
}
