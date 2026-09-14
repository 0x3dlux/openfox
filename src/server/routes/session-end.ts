/**
 * End-of-session routes
 *
 * "Delete session" is two-phase: POST /sessions/:id/end-session runs the
 * configured end-of-session command (default: bundled `end-of-session`) inside
 * the session and marks it closing, so the chat ends with the routine's summary
 * and the user confirms the actual delete from the chat. Cancelling the closing
 * (DELETE) just lets the session live on.
 *
 * When the setting is empty or names an unknown command the routine is
 * disabled, and end-session degrades to today's immediate delete.
 */

import { Router, type Request, type Response } from 'express'
import type { ServerMessage, SessionClosingPayload } from '../../shared/protocol.js'
import type { SessionManager } from '../session/manager.js'
import { getSetting, SETTINGS_KEYS, DEFAULT_END_OF_SESSION_COMMAND } from '../db/settings.js'
import { updateSessionClosing } from '../db/sessions.js'
import { loadAllCommands, findCommandById } from '../commands/registry.js'
import { expandCommandPrompt } from '../tasks/slash.js'
import { serverT } from '../i18n.js'
import { logger } from '../utils/logger.js'

export interface SessionEndRoutesDeps {
  sessionManager: Pick<
    SessionManager,
    'getSession' | 'queueMessage' | 'cancelQueuedMessage' | 'getQueueState' | 'setMode' | 'getProjectWorkdir'
  >
  configDir: string
  /** The destructive path (abort + delete + broadcast), owned by the caller. */
  hardDelete: (sessionId: string) => void | Promise<void>
  broadcast?: (message: ServerMessage) => void
}

export interface EndOfSessionLaunch {
  commandId: string
  prompt: string
  agentMode?: string
}

/**
 * Resolve the configured end-of-session command for a project. Returns null
 * when disabled (empty setting) or the id resolves to no runnable command
 * (unknown id, or a command with unfilled parameters).
 */
export async function resolveEndOfSessionCommand(
  configDir: string,
  projectDir?: string,
): Promise<EndOfSessionLaunch | null> {
  const configured = (getSetting(SETTINGS_KEYS.END_OF_SESSION_COMMAND) ?? DEFAULT_END_OF_SESSION_COMMAND).trim()
  if (!configured) return null

  const command = findCommandById(configured, await loadAllCommands(configDir, projectDir))
  if (!command) {
    logger.warn(`End-of-session command "${configured}" not found - running the plain close instead`, { projectDir })
    return null
  }

  const { prompt, unfilledParams } = expandCommandPrompt(command.prompt, [])
  if (unfilledParams.length > 0) {
    logger.warn(`End-of-session command "${configured}" needs parameters - running the plain close instead`)
    return null
  }

  return {
    commandId: configured,
    prompt,
    ...(command.metadata.agentMode ? { agentMode: command.metadata.agentMode } : {}),
  }
}

export function registerSessionEndRoutes(router: Router, deps: SessionEndRoutesDeps): void {
  const findSession = (req: Request, res: Response) => {
    const sessionId = req.params['id'] as string
    const session = deps.sessionManager.getSession(sessionId)
    if (!session) {
      res.status(404).json({ error: serverT({ en: 'Session not found', fr: 'Session introuvable' }) })
      return null
    }
    return { sessionId, session }
  }

  router.post('/sessions/:id/end-session', async (req: Request, res: Response) => {
    const target = findSession(req, res)
    if (!target) return
    const { sessionId, session } = target

    let launch: EndOfSessionLaunch | null
    try {
      launch = await resolveEndOfSessionCommand(deps.configDir, session.workdir)
    } catch (error) {
      // A broken command definition must never block closing a session.
      logger.error('Failed to resolve the end-of-session command', {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      })
      launch = null
    }

    if (!launch) {
      await deps.hardDelete(sessionId)
      return res.json({ deleted: true })
    }

    if (launch.agentMode) {
      try {
        deps.sessionManager.setMode(sessionId, launch.agentMode)
      } catch {
        // Unknown agent id - keep the session's current agent.
      }
    }

    const closingAt = new Date().toISOString()
    updateSessionClosing(sessionId, closingAt)
    deps.sessionManager.queueMessage(sessionId, 'asap', launch.prompt, undefined, 'command')
    deps.broadcast?.({
      type: 'session.closing',
      sessionId,
      payload: { closingAt } satisfies SessionClosingPayload,
    })
    res.json({ closing: true, command: launch.commandId })
  })

  router.delete('/sessions/:id/end-session', async (req: Request, res: Response) => {
    const target = findSession(req, res)
    if (!target) return
    const { sessionId, session } = target

    // Withdraw the routine when it never got its turn (the session was busy, so
    // the prompt is still queued): a kept session must not wrap itself up later.
    const launch = await resolveEndOfSessionCommand(deps.configDir, session.workdir).catch(() => null)
    if (launch) {
      for (const queued of deps.sessionManager.getQueueState(sessionId)) {
        if (queued.messageKind === 'command' && queued.content === launch.prompt) {
          deps.sessionManager.cancelQueuedMessage(sessionId, queued.queueId)
        }
      }
    }

    updateSessionClosing(sessionId, null)
    deps.broadcast?.({ type: 'session.closing', sessionId, payload: { closingAt: null } })
    res.json({ success: true })
  })
}
