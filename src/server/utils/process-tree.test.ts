import { describe, it, expect } from 'vitest'
import { spawn, execFile } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { terminateProcessTree } from './process-tree.js'

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Collect all descendant PIDs via ps */
async function getDescendants(rootPid: number): Promise<number[]> {
  const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
    execFile('ps', ['-eo', 'pid=,ppid='], { timeout: 5000 }, (err, stdout) => {
      if (err) reject(err)
      else resolve({ stdout })
    })
  })
  const children = new Map<number, number[]>()
  for (const line of stdout.trim().split('\n')) {
    const parts = line.trim().split(/\s+/)
    const pid = parseInt(parts[0]!, 10)
    const ppid = parseInt(parts[1]!, 10)
    if (!isNaN(pid) && !isNaN(ppid) && pid > 0 && ppid >= 0) {
      if (!children.has(ppid)) children.set(ppid, [])
      children.get(ppid)!.push(pid)
    }
  }
  const descendants: number[] = []
  const queue = [rootPid]
  while (queue.length > 0) {
    const current = queue.shift()!
    const kids = children.get(current)
    if (kids) {
      for (const kid of kids) {
        descendants.push(kid)
        queue.push(kid)
      }
    }
  }
  return descendants
}

describe('terminateProcessTree', () => {
  it('kills a simple sleep process', async () => {
    const proc = spawn('sleep', ['30'], { stdio: 'ignore', detached: true })
    expect(proc.pid).toBeTruthy()
    expect(isAlive(proc.pid!)).toBe(true)

    await terminateProcessTree(proc)
    await sleep(100)

    expect(isAlive(proc.pid!)).toBe(false)
  })

  it('kills all descendants of a shell process', async () => {
    // Spawn a shell that creates multiple child processes
    const proc = spawn(
      'bash',
      [
        '-c',
        `sleep 100 &
       sleep 200 &
       # Stay alive in foreground
       sleep 300`,
      ],
      { stdio: 'ignore', detached: true },
    )

    expect(proc.pid).toBeTruthy()
    await sleep(400)

    const descendants = await getDescendants(proc.pid!)
    expect(descendants.length).toBeGreaterThanOrEqual(2)

    // All should be alive before termination
    for (const pid of descendants) {
      expect(isAlive(pid)).toBe(true)
    }

    // Terminate the tree
    await terminateProcessTree(proc)
    await sleep(300)

    // All should be dead now
    expect(isAlive(proc.pid!)).toBe(false)
    for (const pid of descendants) {
      expect(isAlive(pid)).toBe(false)
    }
  }, 20000)

  it('handles already-exited process gracefully', async () => {
    const proc = spawn('echo', ['hi'], { stdio: 'ignore' })
    await new Promise<void>((resolve) => proc.on('close', () => resolve()))
    await expect(terminateProcessTree(proc)).resolves.toBeUndefined()
  })

  it('handles null pid gracefully', async () => {
    const fakeProc = { pid: undefined } as any
    await expect(terminateProcessTree(fakeProc)).resolves.toBeUndefined()
  })

  it('handles nonexistent pid gracefully', async () => {
    const fakeProc = { pid: 999999999 } as any
    await expect(terminateProcessTree(fakeProc)).resolves.toBeUndefined()
  })
})
