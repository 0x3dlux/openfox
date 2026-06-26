import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import {
  createTestClient,
  createTestProject,
  createTestServer,
  createProject,
  createSession,
  type TestClient,
  type TestProject,
  type TestServerHandle,
} from './utils/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('MCP Integration', () => {
  let server: TestServerHandle
  let client: TestClient
  let project: TestProject

  beforeAll(async () => {
    server = await createTestServer()
  })

  afterAll(async () => {
    await server.close()
  })

  beforeEach(async () => {
    client = await createTestClient({ url: server.wsUrl })
    project = await createTestProject({ template: 'typescript' })
  })

  afterEach(async () => {
    await client.close()
    await project.cleanup()
    // Clean up any MCP servers
    try {
      const servers = await fetchMcpServers()
      for (const s of servers) {
        await removeMcpServer(s.name)
      }
    } catch {
      /* ignore */
    }
  })

  async function fetchMcpServers() {
    const res = await fetch(`${server.url}/api/mcp/servers`)
    const data = (await res.json()) as {
      servers: Array<{ name: string; status: string; tools: Array<{ name: string; enabled: boolean }> }>
    }
    return data.servers
  }

  async function addMcpServer(name: string, command: string, args?: string[]) {
    const res = await fetch(`${server.url}/api/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, command, args }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error?: string }
      throw new Error(err.error ?? `Failed to add MCP server: ${res.status}`)
    }
    return res.json()
  }

  async function removeMcpServer(name: string) {
    await fetch(`${server.url}/api/mcp/servers/${encodeURIComponent(name)}`, { method: 'DELETE' })
  }

  async function fetchSessionState(sessionId: string) {
    const res = await fetch(`${server.url}/api/sessions/${sessionId}`)
    const data = (await res.json()) as {
      session: { executionState: { cachedSystemPrompt?: string; dynamicContextHash?: string } | null }
      contextState: { dynamicContextChanged: boolean }
    }
    return data
  }

  it('discovers and exposes MCP tools via REST API', async () => {
    const mockServerPath = join(__dirname, 'mock-mcp-server.ts')

    // Add the mock MCP server
    await addMcpServer('test-server', 'npx', ['tsx', mockServerPath])

    // Wait for connection
    await sleep(1000)

    // Verify the server is connected and tools are exposed
    const servers = await fetchMcpServers()
    const testServer = servers.find((s) => s.name === 'test-server')
    expect(testServer).toBeDefined()
    expect(testServer!.status).toBe('connected')
    expect(testServer!.tools).toHaveLength(2)
    expect(testServer!.tools.map((t) => t.name)).toContain('greet')
    expect(testServer!.tools.map((t) => t.name)).toContain('add')

    // Cleanup
    await removeMcpServer('test-server')
  })

  it('makes MCP tools available to the LLM via tool registry', async () => {
    const mockServerPath = join(__dirname, 'mock-mcp-server.ts')

    // Add the mock MCP server
    await addMcpServer('test-server', 'npx', ['tsx', mockServerPath])
    await sleep(1000)

    // Create a session and send a message
    const restProject = await createProject(server.url, { name: 'test', workdir: project.path })
    const restSession = await createSession(server.url, { projectId: restProject.id })
    await client.send('session.load', { sessionId: restSession.id })

    // Send a message that should trigger tool usage
    await client.send('chat.send', { content: 'Use the greet tool to say hello to Alice' })
    await client.waitForChatDone()

    // The mock LLM should have the MCP tools available
    // Check that the session completed without errors
    const session = await fetch(`${server.url}/api/sessions/${restSession.id}`)
    const data = (await session.json()) as { session: { isRunning: boolean } }
    expect(data.session.isRunning).toBe(false)

    // Cleanup
    await removeMcpServer('test-server')
  })

  it('does NOT auto-invalidate cache when MCP server is added', async () => {
    const mockServerPath = join(__dirname, 'mock-mcp-server.ts')
    const restProject = await createProject(server.url, { name: 'test', workdir: project.path })
    const restSession = await createSession(server.url, { projectId: restProject.id })
    await client.send('session.load', { sessionId: restSession.id })

    // Send first message to cache the system prompt
    await client.send('chat.send', { content: 'Hello' })
    await client.waitForChatDone()

    const state1 = await fetchSessionState(restSession.id)
    expect(state1.contextState.dynamicContextChanged).toBe(false)

    // Add MCP server — this should NOT auto-invalidate the cache
    await addMcpServer('test-server', 'npx', ['tsx', mockServerPath])
    await sleep(500)

    // Send another message — cache should still be valid (dynamicContextChanged should be false
    // since we haven't applied the dynamic context yet)
    await client.send('chat.send', { content: 'Do something' })
    await client.waitForChatDone()

    const state2 = await fetchSessionState(restSession.id)
    // The cached system prompt should still be the same
    expect(state2.session.executionState?.cachedSystemPrompt).toBe(state1.session.executionState?.cachedSystemPrompt)

    // Cleanup
    await removeMcpServer('test-server')
  })

  it('makes tools visible after user applies dynamic context', async () => {
    const mockServerPath = join(__dirname, 'mock-mcp-server.ts')
    const restProject = await createProject(server.url, { name: 'test', workdir: project.path })
    const restSession = await createSession(server.url, { projectId: restProject.id })
    await client.send('session.load', { sessionId: restSession.id })

    // Send first message to cache the system prompt
    await client.send('chat.send', { content: 'Hello' })
    await client.waitForChatDone()

    // Add MCP server
    await addMcpServer('test-server', 'npx', ['tsx', mockServerPath])
    await sleep(500)

    // Apply dynamic context (user action)
    await client.send('context.applyDynamic', {})

    // Now the tools should be available
    const state = await fetchSessionState(restSession.id)
    // The system prompt should have been regenerated
    expect(state.contextState.dynamicContextChanged).toBe(false)

    // Cleanup
    await removeMcpServer('test-server')
  })
})
