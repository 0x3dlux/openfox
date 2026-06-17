import type { LLMClient } from '../llm/types.js'
import type { LLMCompletionRequest, LLMToolDefinition } from '../llm/types.js'
import { streamWithSegments } from '../llm/streaming.js'

function buildStreamRequestObject(params: {
  messages: LLMCompletionRequest['messages']
  tools?: LLMToolDefinition[] | undefined
  toolChoice?: LLMCompletionRequest['toolChoice']
  disableThinking?: boolean | undefined
  signal?: AbortSignal | undefined
  modelSettings?:
    | { temperature?: number; topP?: number; topK?: number; maxTokens?: number; supportsVision?: boolean }
    | undefined
  disableXmlProtection?: boolean
}): LLMCompletionRequest {
  const { messages, tools, toolChoice, disableThinking, signal, modelSettings, disableXmlProtection } = params
  return {
    messages,
    ...(tools && { tools }),
    ...(toolChoice && { toolChoice }),
    disableThinking: disableThinking ?? false,
    ...(signal && { signal }),
    ...(modelSettings && { modelSettings }),
    ...(disableXmlProtection !== undefined && { disableXmlProtection }),
  }
}

export type BuildStreamRequestOptions = Parameters<typeof buildStreamRequestObject>[0]

export function buildStreamRequest(client: LLMClient, options: BuildStreamRequestOptions) {
  return streamWithSegments(client, buildStreamRequestObject(options))
}
