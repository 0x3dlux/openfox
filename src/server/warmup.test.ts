import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import { createServer, type Server } from 'node:http'
import type { SessionManager } from './session/manager.js'
import type { LLMClientWithModel } from './llm/client.js'

function mountWarmupRoute(
  app: express.Express,
  deps: {
    sessionManager: Pick<SessionManager, 'getSession' | 'isWarmedUp' | 'markWarmedUp'>
    getLLMClient: () => Pick<LLMClientWithModel, 'getBackend' | 'getModel'>
    getSetting?: (key: string) => string | null
    logger?: { debug: (...args: unknown[]) => void }
  },
) {
  app.use(express.json())

  app.post('/api/sessions/:id/warmup', async (req, res) => {
    const sessionId = req.params.id
    const session = deps.sessionManager.getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    if (deps.getSetting?.('cache.warming') !== 'true') {
      return res.json({ success: false, reason: 'disabled' })
    }

    if (session.messages.length > 0) {
      return res.json({ success: false, reason: 'not_empty' })
    }

    if (deps.sessionManager.isWarmedUp(sessionId)) {
      return res.json({ success: false, reason: 'already_warmed' })
    }

    deps.sessionManager.markWarmedUp(sessionId)
    res.json({ success: true })
  })
}

async function fetchJson(url: string, options?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, options)
  const body = await response.json()
  return { status: response.status, body }
}

async function closeServer(srv: Server): Promise<void> {
  return new Promise((resolve) => srv.close(() => resolve()))
}

describe('POST /api/sessions/:id/warmup', () => {
  let server: Server
  let baseUrl: string
  let mockSessionManager: Pick<SessionManager, 'getSession' | 'isWarmedUp' | 'markWarmedUp'>
  let mockGetLLMClient: () => Pick<LLMClientWithModel, 'getBackend' | 'getModel'>

  async function startServer(getSettingFn?: (key: string) => string | null) {
    const app = express()
    mountWarmupRoute(app, {
      sessionManager: mockSessionManager,
      getLLMClient: mockGetLLMClient,
      ...(getSettingFn ? { getSetting: getSettingFn } : {}),
    })
    return new Promise<void>((resolve) => {
      server = createServer(app)
      server.listen(0, () => {
        const addr = server.address()
        baseUrl = `http://localhost:${(addr as { port: number }).port}`
        resolve()
      })
    })
  }

  beforeEach(async () => {
    mockSessionManager = {
      getSession: vi.fn(),
      isWarmedUp: vi.fn().mockReturnValue(false),
      markWarmedUp: vi.fn(),
    }
    mockGetLLMClient = vi.fn().mockReturnValue({
      getBackend: vi.fn().mockReturnValue('test'),
      getModel: vi.fn().mockReturnValue('test-model'),
    })
    await startServer()
  })

  afterEach(() => {
    server?.close()
  })

  it('returns 404 when session is not found', async () => {
    ;(mockSessionManager.getSession as any).mockReturnValue(null)

    const { status, body } = await fetchJson(`${baseUrl}/api/sessions/nonexistent/warmup`, { method: 'POST' })
    expect(status).toBe(404)
    expect(body).toEqual({ error: 'Session not found' })
  })

  it('returns not_empty when session has messages', async () => {
    await closeServer(server)
    await startServer(() => 'true')
    ;(mockSessionManager.getSession as any).mockReturnValue({
      id: 'test-session',
      messages: [{ id: 'msg-1', role: 'user', content: 'hello' }],
    })

    const { status, body } = await fetchJson(`${baseUrl}/api/sessions/test-session/warmup`, { method: 'POST' })
    expect(status).toBe(200)
    expect(body).toEqual({ success: false, reason: 'not_empty' })
  })

  it('returns already_warmed when warmup was already performed', async () => {
    await closeServer(server)
    await startServer(() => 'true')
    ;(mockSessionManager.getSession as any).mockReturnValue({
      id: 'test-session',
      messages: [],
    })
    ;(mockSessionManager.isWarmedUp as any).mockReturnValue(true)

    const { status, body } = await fetchJson(`${baseUrl}/api/sessions/test-session/warmup`, { method: 'POST' })
    expect(status).toBe(200)
    expect(body).toEqual({ success: false, reason: 'already_warmed' })
  })

  it('returns success and marks warmed up for empty session when setting is enabled', async () => {
    await closeServer(server)
    await startServer(() => 'true')
    ;(mockSessionManager.getSession as any).mockReturnValue({
      id: 'test-session',
      messages: [],
    })

    const { status, body } = await fetchJson(`${baseUrl}/api/sessions/test-session/warmup`, { method: 'POST' })
    expect(status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(mockSessionManager.markWarmedUp).toHaveBeenCalledWith('test-session')
  })

  it('returns disabled when cache.warming setting is not enabled', async () => {
    await closeServer(server)
    await startServer(() => 'false')
    ;(mockSessionManager.getSession as any).mockReturnValue({
      id: 'test-session',
      messages: [],
    })

    const { status, body } = await fetchJson(`${baseUrl}/api/sessions/test-session/warmup`, { method: 'POST' })
    expect(status).toBe(200)
    expect(body).toEqual({ success: false, reason: 'disabled' })
    expect(mockSessionManager.markWarmedUp).not.toHaveBeenCalled()
  })
})
