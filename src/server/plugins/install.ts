import { execFile } from 'node:child_process'
import { cp, mkdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

export function parseGithubUrl(githubUrl: string): { owner: string; repo: string; cloneUrl: string } {
  const parsed = githubUrl.match(/github\.com\/([^/]+)\/([^/?#]+)/)
  if (!parsed) throw new Error('Invalid GitHub URL')
  const owner = parsed[1]!
  const repo = parsed[2]!.replace(/\.git$/, '')
  if (!/^[a-zA-Z0-9_.-]+$/.test(repo)) throw new Error('Invalid repository name')
  return { owner, repo, cloneUrl: `https://github.com/${owner}/${repo}.git` }
}

export function sanitizePackageName(name: string): string {
  const sanitized = name.replace(/^@/, '').replace(/[/\\]/g, '__')
  if (!/^[a-zA-Z0-9_.-]+$/.test(sanitized)) throw new Error('Invalid package name')
  return sanitized
}

async function ensureGit(): Promise<void> {
  try {
    await execFileP('git', ['--version'], { timeout: 5000 })
  } catch {
    throw new Error('git is not installed or not found in PATH')
  }
}

export async function installPluginFromGithub(githubUrl: string, pluginsDir: string): Promise<string> {
  const { repo, cloneUrl } = parseGithubUrl(githubUrl)
  await mkdir(pluginsDir, { recursive: true })
  await ensureGit()

  const targetDir = join(pluginsDir, repo)
  const tmpDir = join(pluginsDir, `.${repo}-tmp-${Date.now()}`)
  try {
    await execFileP('git', ['clone', '--depth', '1', cloneUrl, tmpDir], { timeout: 60000 })
    await rm(targetDir, { recursive: true, force: true })
    await rename(tmpDir, targetDir)
    await buildIfNeeded(targetDir)
    return targetDir
  } catch (error) {
    await rm(tmpDir, { recursive: true, force: true })
    throw error
  }
}

export async function installPluginFromNpm(packageName: string, pluginsDir: string): Promise<string> {
  await mkdir(pluginsDir, { recursive: true })
  await execFileP('npm', ['install', '--no-audit', '--no-fund', '--prefix', pluginsDir, packageName], {
    timeout: 180000,
  })
  return join(pluginsDir, 'node_modules', packageName)
}

export async function installPluginFromPath(sourcePath: string, pluginsDir: string): Promise<string> {
  await mkdir(pluginsDir, { recursive: true })
  const targetDir = join(pluginsDir, sanitizePackageName(basename(sourcePath)))
  await rm(targetDir, { recursive: true, force: true })
  await cp(sourcePath, targetDir, {
    recursive: true,
    filter: (source) => {
      const name = basename(source)
      return name !== 'node_modules' && name !== '.git'
    },
  })
  await buildIfNeeded(targetDir)
  return targetDir
}

export async function buildIfNeeded(directory: string): Promise<void> {
  let manifest: { scripts?: Record<string, string> } = {}
  try {
    manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')) as typeof manifest
  } catch {
    return
  }
  if (!manifest.scripts?.['build']) return
  await execFileP('npm', ['install', '--no-audit', '--no-fund'], { cwd: directory, timeout: 180000 })
  await execFileP('npm', ['run', 'build'], { cwd: directory, timeout: 180000 })
}
