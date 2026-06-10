import type { StreamingBuffer } from './types'

const buffer: StreamingBuffer = {
  messageId: null,
  deltaContent: '',
  thinkingContent: '',
  toolOutput: [],
}

let streamingRafId: number | null = null
let flushFn: (() => void) | null = null

export function setFlushFn(fn: () => void) {
  flushFn = fn
}

export function getBuffer(): StreamingBuffer {
  return buffer
}

export function scheduleStreamingFlush() {
  if (streamingRafId !== null) return
  streamingRafId = requestAnimationFrame(() => {
    streamingRafId = null
    flushFn?.()
  })
}

export function cancelStreamingFlush() {
  if (streamingRafId !== null) {
    cancelAnimationFrame(streamingRafId)
    streamingRafId = null
  }
}
