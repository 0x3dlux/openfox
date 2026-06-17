import type { SessionManager } from '../session/index.js'
import { getSetting, SETTINGS_KEYS } from '../db/settings.js'
import { computeDynamicContextHash } from './dynamic-context.js'
import { createAssemblyResult, type AssemblyResult } from './request-context.js'
import type { RequestContextMessage } from './request-context.js'
import type { InjectedFile } from '../../shared/types.js'
import type { LLMToolDefinition } from '../llm/types.js'
import type { SkillMetadata } from '../skills/types.js'

export interface CacheContext {
  sessionManager: SessionManager
  sessionId: string
  workdir: string
  messages: RequestContextMessage[]
  injectedFiles: InjectedFile[]
  promptTools: LLMToolDefinition[]
  instructionContent?: string
  skills: SkillMetadata[]
  assembleFreshRequest: () => AssemblyResult
}

export interface CachedAssemblyResult {
  assembledRequest: AssemblyResult
  isDynamicMode: boolean
}

export function resolveCachedAssembly(ctx: CacheContext): CachedAssemblyResult {
  const isDynamicMode = getSetting(SETTINGS_KEYS.LLM_DYNAMIC_SYSTEM_PROMPT) === 'true'

  if (isDynamicMode) {
    return { assembledRequest: ctx.assembleFreshRequest(), isDynamicMode: true }
  }

  const dynamicHash = computeDynamicContextHash(ctx.instructionContent ?? '', ctx.skills)
  const session = ctx.sessionManager.requireSession(ctx.sessionId)
  const execState = session.executionState
  const hashMatch = execState?.dynamicContextHash === dynamicHash
  const hasCached = !!execState?.cachedSystemPrompt

  if (hasCached) {
    if (hashMatch && ctx.sessionManager.getDynamicContextChanged(ctx.sessionId)) {
      ctx.sessionManager.setDynamicContextChanged(ctx.sessionId, false)
    } else if (!hashMatch && !ctx.sessionManager.getDynamicContextChanged(ctx.sessionId)) {
      ctx.sessionManager.setDynamicContextChanged(ctx.sessionId, true)
    }
    return {
      assembledRequest: createAssemblyResult({
        systemPrompt: execState!.cachedSystemPrompt!,
        messages: ctx.messages,
        injectedFiles: ctx.injectedFiles,
        requestTools: ctx.promptTools,
        toolChoice: 'auto',
        disableThinking: false,
      }),
      isDynamicMode: false,
    }
  }

  const assembledRequest = ctx.assembleFreshRequest()
  ctx.sessionManager.setCachedPrompt(ctx.sessionId, assembledRequest.systemPrompt, dynamicHash)
  ctx.sessionManager.setDynamicContextChanged(ctx.sessionId, false)
  return { assembledRequest, isDynamicMode: false }
}
