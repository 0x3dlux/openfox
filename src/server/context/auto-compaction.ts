import type { Provider, StatsIdentity } from '../../shared/types.js'
import type { LLMClientWithModel } from '../llm/client.js'
import type { SessionManager } from '../session/index.js'
import { getEventStore, getCurrentWindowMessageOptions } from '../events/index.js'
import { shouldCompact } from './compactor.js'
import { COMPACTION_PROMPT } from '../chat/prompts.js'
import { assembleAgentRequest } from '../chat/request-context.js'
import { TurnMetrics, createMessageStartEvent } from '../chat/stream-pure.js'
import { runTopLevelAgentLoop } from '../chat/agent-loop.js'
import { loadAllAgentsDefault, findAgentById, getSubAgents } from '../agents/registry.js'
import { getToolRegistryForAgent } from '../tools/index.js'
import { getRuntimeConfig } from '../runtime-config.js'
import { logger } from '../utils/logger.js'
import { getConversationMessages } from '../chat/conversation-history.js'
import { processContextImages, loadVisionModelFromGlobalConfig } from '../context/image-processor.js'
import { modelSupportsVision } from '../llm/profiles.js'

interface ContextCompactionOptions {
  sessionManager: SessionManager
  sessionId: string
  llmClient: LLMClientWithModel
  statsIdentity: StatsIdentity
  signal?: AbortSignal
}

export async function maybeAutoCompactContext(options: ContextCompactionOptions): Promise<boolean> {
  const config = getRuntimeConfig()
  const contextState = options.sessionManager.getContextState(options.sessionId)
  if (!shouldCompact(contextState.currentTokens, contextState.maxTokens, config.context.compactionThreshold)) {
    return false
  }

  try {
    await performContextCompaction({
      ...options,
      tokenCountAtClose: contextState.currentTokens,
      trigger: 'auto',
    })
    return true
  } catch (error) {
    // Abort errors should still propagate (user cancelled)
    if (error instanceof Error && error.message === 'Aborted') {
      throw error
    }

    logger.error('Auto-compaction failed, continuing without compaction', {
      sessionId: options.sessionId,
      error: error instanceof Error ? error.message : String(error),
      currentTokens: contextState.currentTokens,
      maxTokens: contextState.maxTokens,
    })

    // Emit a visible warning so the user knows compaction failed
    const eventStore = getEventStore()
    eventStore.append(options.sessionId, {
      type: 'chat.error',
      data: {
        error: `Auto-compaction failed: ${error instanceof Error ? error.message : 'Unknown error'}. Continuing with full context.`,
        recoverable: true,
      },
    })

    return false
  }
}

export async function performManualContextCompaction(
  options: ContextCompactionOptions & {
    tokenCountAtClose: number
  },
): Promise<void> {
  await performContextCompaction({
    ...options,
    trigger: 'manual',
  })
}

async function performContextCompaction(
  options: ContextCompactionOptions & {
    tokenCountAtClose: number
    trigger: 'auto' | 'manual'
  },
): Promise<void> {
  const { sessionManager, sessionId, llmClient, statsIdentity, signal } = options
  const eventStore = getEventStore()

  // Append compaction prompt to EventStore so getConversationMessages picks it up
  const compactPromptMsgId = crypto.randomUUID()
  eventStore.append(
    sessionId,
    createMessageStartEvent(compactPromptMsgId, 'user', COMPACTION_PROMPT, {
      ...(getCurrentWindowMessageOptions(sessionId) ?? {}),
      isSystemGenerated: true,
      messageKind: 'auto-prompt',
      metadata: { type: 'compaction', name: 'Compaction', color: '#64748b' },
    }),
  )
  eventStore.append(sessionId, { type: 'message.done', data: { messageId: compactPromptMsgId } })

  const turnMetrics = new TurnMetrics()

  const allAgents = await loadAllAgentsDefault()
  const plannerDef = findAgentById('planner', allAgents)!
  const subAgentDefs = getSubAgents(allAgents)
  const toolRegistry = getToolRegistryForAgent(plannerDef)

  await runTopLevelAgentLoop(
    {
      mode: 'planner',
      loopMode: 'compaction',
      append: (event) => eventStore.append(sessionId, event),
      sessionManager,
      sessionId,
      llmClient,
      statsIdentity,
      signal,
      assembleRequest: (input) =>
        assembleAgentRequest({
          ...input,
          agentDef: plannerDef,
          subAgentDefs,
          modelName: llmClient.getModel(),
          disableThinking: true,
        }),
      getToolRegistry: () => toolRegistry,
      getConversationMessages: async () => {
        const rawEvents = eventStore.getEvents(sessionId)
        const modelVision = modelSupportsVision(llmClient.getModel())
        const runtimeConfig = getRuntimeConfig()
        const visionModel = runtimeConfig.llm.visionModel
          ? {
              baseUrl: runtimeConfig.llm.baseUrl,
              model: runtimeConfig.llm.visionModel,
              timeout: runtimeConfig.llm.timeout,
            }
          : await loadVisionModelFromGlobalConfig()
        const { events: processedEvents } = await processContextImages(rawEvents, {
          modelSupportsVision: modelVision,
          ...(visionModel ? { visionModel } : {}),
          onEvent: (event) => eventStore.append(sessionId, event),
        })
        return getConversationMessages({ type: 'toplevel', sessionId }, { events: processedEvents })
      },
    },
    turnMetrics,
  )

  logger.info(`${options.trigger === 'auto' ? 'Auto' : 'Manual'} compaction complete`, {
    sessionId,
    trigger: options.trigger,
    tokensBefore: options.tokenCountAtClose,
  })
}

export function resolveCompactionStatsIdentity(
  llmClient: LLMClientWithModel,
  getActiveProvider?: () => Provider | undefined,
): StatsIdentity {
  const provider = getActiveProvider?.()
  const model = llmClient.getModel()
  const backend = llmClient.getBackend?.() ?? 'unknown'

  return {
    providerId: provider?.id ?? `provider:${model}`,
    providerName: provider?.name ?? 'Unknown Provider',
    backend,
    model,
  }
}
