import type { StreamingBuffer } from './types'

const buffer: StreamingBuffer = {
  messageId: null,
  deltaContent: '',
  thinkingContent: '',
  toolOutput: [],
}

let flushFn: (() => void) | null = null

export function setFlushFn(fn: () => void) {
  flushFn = fn
}

export function getBuffer(): StreamingBuffer {
  return buffer
}

export function scheduleStreamingFlush() {
  flushFn?.()
}

export function cancelStreamingFlush() {
  // No-op: flush is synchronous now
}
