import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionManager } from '../session/index.js'
import type { TurnMetrics } from './stream-pure.js'
import type { EventStore } from '../events/store.js'
import type { TopLevelLoopConfig } from './agent-loop.js'

vi.mock('../events/store.js', () => ({
  getEventStore: vi.fn(),
}))

vi.mock('../db/settings.js', () => ({
  getSetting: vi.fn(),
  SETTINGS_KEYS: { LLM_DYNAMIC_SYSTEM_PROMPT: 'llm.dynamicSystemPrompt' },
}))

vi.mock('../context/instructions.js', () => ({
  getAllInstructions: vi.fn(),
}))

vi.mock('../skills/registry.js', () => ({
  getEnabledSkillMetadata: vi.fn(),
}))

vi.mock('../runtime-config.js', () => ({
  getRuntimeConfig: vi.fn().mockReturnValue({ mode: 'test', workdir: '/test' }),
}))

vi.mock('../../cli/paths.js', () => ({
  getGlobalConfigDir: vi.fn().mockReturnValue('/test/config'),
}))

vi.mock('../context/auto-compaction.js', () => ({
  maybeAutoCompactContext: vi.fn(),
}))

vi.mock('./conversation-history.js', () => ({
  getConversationMessages: vi.fn().mockReturnValue([]),
}))

import { runTopLevelAgentLoop } from './agent-loop.js'
import { getEventStore } from '../events/store.js'
import { getSetting } from '../db/settings.js'
import { getAllInstructions } from '../context/instructions.js'
import { getEnabledSkillMetadata } from '../skills/registry.js'

describe('agentLoop compaction mode', () => {
  let mockEventStore: EventStore
  let mockSessionManager: SessionManager
  let mockLLMClient: any
  let mockTurnMetrics: TurnMetrics
  let assembleRequestMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockEventStore = {
      append: vi.fn(),
      getEvents: vi.fn().mockReturnValue([]),
      getLatestSeq: vi.fn().mockReturnValue(0),
      cleanupOldEvents: vi.fn().mockReturnValue(0),
    } as unknown as EventStore
    ;(getEventStore as any).mockReturnValue(mockEventStore)

    mockLLMClient = {
      getModel: vi.fn().mockReturnValue('test-model'),
    }

    mockTurnMetrics = {
      addToolTime: vi.fn(),
      addLLMCall: vi.fn(),
      buildStats: vi.fn().mockReturnValue({}),
    } as unknown as TurnMetrics

    assembleRequestMock = vi.fn().mockReturnValue({
      systemPrompt: 'test-prompt',
      messages: [],
      promptContext: {
        systemPrompt: 'test-prompt',
        injectedFiles: [],
        userMessage: '',
        messages: [],
        tools: [],
        requestOptions: { toolChoice: 'auto', disableThinking: false },
      },
    })
    ;(getAllInstructions as any).mockResolvedValue({ content: 'test instructions', files: [] })
    ;(getEnabledSkillMetadata as any).mockResolvedValue([])
    ;(getSetting as any).mockReturnValue('false')
  })

  function makeConfig(overrides?: Partial<TopLevelLoopConfig>): TopLevelLoopConfig {
    return {
      mode: 'planner',
      append: vi.fn(),
      sessionManager: mockSessionManager,
      sessionId: 'test-session',
      llmClient: mockLLMClient,
      statsIdentity: { providerId: 'test', providerName: 'Test', backend: 'unknown' as const, model: 'test-model' },
      assembleRequest: assembleRequestMock as any,
      getToolRegistry: () => ({ definitions: [], execute: vi.fn() }) as any,
      ...overrides,
    }
  }

  it('accepts loopMode compaction in config', async () => {
    mockSessionManager = {
      requireSession: vi.fn().mockReturnValue({
        workdir: '/test',
        projectId: 'test-project',
        executionState: null,
        criteria: [],
        isRunning: false,
      }),
      getContextState: vi.fn().mockReturnValue({
        currentTokens: 0, maxTokens: 200000, compactionCount: 0,
        dangerZone: false, canCompact: false, dynamicContextChanged: false,
      }),
      getCurrentModelSettings: vi.fn().mockReturnValue({}),
      setCurrentContextSize: vi.fn(),
      getDynamicContextChanged: vi.fn().mockReturnValue(false),
      setDynamicContextChanged: vi.fn(),
      getCachedPrompt: vi.fn().mockReturnValue(undefined),
      setCachedPrompt: vi.fn(),
      getLspManager: vi.fn(),
      drainAsapMessages: vi.fn().mockReturnValue([]),
      getCurrentWindowMessages: vi.fn().mockReturnValue([]),
      updateMessage: vi.fn(),
    } as any

    const promise = runTopLevelAgentLoop(makeConfig({ loopMode: 'compaction' }), mockTurnMetrics)
    await expect(promise).rejects.toThrow()
  })
})
