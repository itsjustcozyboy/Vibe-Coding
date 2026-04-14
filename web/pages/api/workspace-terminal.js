import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'

const DEFAULT_WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/workspaces/Vibe-Coding'
const COMMAND_TIMEOUT_MS = Number(process.env.WORKSPACE_COMMAND_TIMEOUT_MS || 30000)
const MAX_OUTPUT_CHARS = 25000

function resolveWorkspaceRoot() {
  if (fs.existsSync(DEFAULT_WORKSPACE_ROOT)) {
    return DEFAULT_WORKSPACE_ROOT
  }
  return process.cwd()
}

function getSessions() {
  if (!globalThis.__workspaceTerminalSessions) {
    globalThis.__workspaceTerminalSessions = new Map()
  }
  return globalThis.__workspaceTerminalSessions
}

function createSession() {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const sessions = getSessions()
  const workspaceRoot = resolveWorkspaceRoot()
  const session = {
    id,
    cwd: workspaceRoot,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  sessions.set(id, session)
  return session
}

function isInsideWorkspace(targetPath) {
  const normalizedRoot = path.resolve(resolveWorkspaceRoot())
  const normalizedTarget = path.resolve(targetPath)
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`)
}

function sanitizeOutput(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n')
  if (normalized.length <= MAX_OUTPUT_CHARS) return normalized
  return `${normalized.slice(0, MAX_OUTPUT_CHARS)}\n\n[output truncated]`
}

function parseClaudeCommand(command) {
  const trimmed = command.trim()
  if (trimmed === 'claude') {
    return { isClaude: true, prompt: '' }
  }
  if (!trimmed.startsWith('claude ')) {
    return { isClaude: false, prompt: '' }
  }
  return { isClaude: true, prompt: trimmed.slice('claude '.length).trim() }
}

function parseGatewayCommand(command) {
  const trimmed = command.trim()
  // Match ./scripts/claude-gateway.sh with optional args
  const match = trimmed.match(/^\.\/scripts\/claude-gateway\.sh(?:\s+(.*))?$/)
  if (!match) {
    return { isGateway: false, prompt: '' }
  }
  // Extract anything after the script name as the prompt
  const prompt = match[1] ? match[1].trim() : ''
  return { isGateway: true, prompt }
}

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.vercel',
  'dist',
  'build',
  '__pycache__',
  '.env',
  '.venv',
  'venv'
])

const EXCLUDED_EXTENSIONS = new Set([
  '.log',
  '.o',
  '.so',
  '.dylib',
  '.exe',
  '.bin',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.zip',
  '.tar',
  '.gz'
])

function shouldExcludePath(filePath) {
  const parts = filePath.split(path.sep)
  for (const part of parts) {
    if (EXCLUDED_DIRS.has(part)) return true
  }
  const ext = path.extname(filePath).toLowerCase()
  if (EXCLUDED_EXTENSIONS.has(ext)) return true
  return false
}

function listWorkspaceFiles(dir, prefix = '', maxDepth = 4, currentDepth = 0) {
  if (currentDepth >= maxDepth) return ''
  
  let output = ''
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (shouldExcludePath(fullPath)) continue

      const isLast = entry === entries[entries.length - 1]
      const connector = isLast ? '└── ' : '├── '
      
      if (entry.isDirectory()) {
        output += `${prefix}${connector}${entry.name}/\n`
        const nextPrefix = prefix + (isLast ? '    ' : '│   ')
        output += listWorkspaceFiles(fullPath, nextPrefix, maxDepth, currentDepth + 1)
      } else {
        output += `${prefix}${connector}${entry.name}\n`
      }
    }
  } catch (err) {
    // Silently skip directories we can't read
  }
  
  return output
}

function canReadAsText(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const textExtensions = new Set([
    '.js', '.ts', '.tsx', '.jsx',
    '.json', '.yaml', '.yml', '.xml',
    '.md', '.txt', '.html', '.css', '.scss', '.less',
    '.py', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.sql',
    '.sh', '.bash', '.env', '.env.local'
  ])
  return textExtensions.has(ext)
}

async function readProjectFiles(rootDir) {
  const files = []
  const MAX_FILE_SIZE = 50000 // 50KB per file
  
  const keyPatterns = [
    'README.md',
    'package.json',
    'vercel.json',
    '.env.example',
    'db/init.sql',
    'docs/**/*.md',
    'src/**/*.js',
    'src/**/*.ts',
    'web/pages/**/*.js',
    'web/components/**/*.js',
    'web/styles/**/*.css',
    'web/package.json'
  ]

  // Helper to read files recursively
  function walkDir(dir, pattern) {
    if (shouldExcludePath(dir)) return

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        if (files.length >= 30) return // Limit total files

        const fullPath = path.join(dir, entry.name)
        if (shouldExcludePath(fullPath)) continue

        if (entry.isDirectory()) {
          walkDir(fullPath, pattern)
        } else if (canReadAsText(fullPath)) {
          const stat = fs.statSync(fullPath)
          if (stat.size <= MAX_FILE_SIZE) {
            files.push(fullPath)
          }
        }
      }
    } catch (err) {
      // Silently skip
    }
  }

  // Read key files first
  for (const pattern of keyPatterns) {
    if (pattern.includes('**')) {
      const dir = pattern.split('/**')[0]
      walkDir(path.join(rootDir, dir), pattern)
    } else {
      const fullPath = path.join(rootDir, pattern)
      if (fs.existsSync(fullPath) && canReadAsText(fullPath)) {
        const stat = fs.statSync(fullPath)
        if (stat.size <= MAX_FILE_SIZE) {
          files.push(fullPath)
        }
      }
    }
  }

  const fileContents = []
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const relativePath = path.relative(rootDir, filePath)
      fileContents.push({
        path: relativePath,
        content: content.slice(0, 40000) // Limit per file
      })
    } catch (err) {
      // Silently skip files we can't read
    }
  }

  return fileContents
}

async function buildProjectContext(rootDir) {
  const fileTree = listWorkspaceFiles(rootDir)
  const projectFiles = await readProjectFiles(rootDir)

  let context = '# Project File Structure\n\n```\n'
  context += fileTree
  context += '```\n\n'

  context += '# Project Files Content\n\n'
  for (const file of projectFiles) {
    context += `## ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`
  }

  return context
}

async function handleGatewayCommand(prompt, command, session, res) {
  const workspaceRoot = resolveWorkspaceRoot()
  
  // Build project context
  let projectContext = ''
  try {
    projectContext = await buildProjectContext(workspaceRoot)
  } catch (error) {
    return res.json({
      ok: true,
      command,
      cwd: session.cwd,
      exitCode: 1,
      timedOut: false,
      stdout: '',
      stderr: `[ERROR] Failed to read project files: ${error.message}`
    })
  }

  // Default prompt if none provided
  const finalPrompt = prompt || 'Analyze this project and provide a comprehensive overview of its structure, purpose, and what work needs to be done next.'

  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN

  if (!apiKey && !authToken) {
    return res.json({
      ok: true,
      command,
      cwd: session.cwd,
      exitCode: 1,
      timedOut: false,
      stdout: '',
      stderr: '[ERROR] Claude auth not configured. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in environment.'
    })
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }

    if (apiKey) {
      headers['x-api-key'] = apiKey
    } else if (authToken) {
      headers['authorization'] = `Bearer ${authToken}`
    }

    const fullPrompt = `${projectContext}\n\nUser Request:\n${finalPrompt}`

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: fullPrompt
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data)
      return res.json({
        ok: true,
        command,
        cwd: session.cwd,
        exitCode: 1,
        timedOut: false,
        stdout: '',
        stderr: `[API ERROR] ${response.status}: ${errorMsg}`
      })
    }

    const text = data.content?.[0]?.text || ''
    session.updatedAt = Date.now()

    return res.json({
      ok: true,
      command,
      cwd: session.cwd,
      exitCode: 0,
      timedOut: false,
      stdout: sanitizeOutput(text),
      stderr: ''
    })
  } catch (error) {
    return res.json({
      ok: true,
      command,
      cwd: session.cwd,
      exitCode: 1,
      timedOut: false,
      stdout: '',
      stderr: `[ERROR] ${error.message || 'Failed to call Claude API'}`
    })
  }
}

function shellQuote(text) {
  return `'${String(text).replace(/'/g, `'"'"'`)}'`
}

function runShellCommand(command, cwd) {
  return new Promise((resolve) => {
    const child = spawn('bash', ['-lc', command], {
      cwd,
      env: process.env
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timeoutId = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
    }, COMMAND_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timeoutId)
      resolve({ code: Number(code || 0), stdout, stderr, timedOut })
    })

    child.on('error', (error) => {
      clearTimeout(timeoutId)
      resolve({ code: 1, stdout, stderr: error.message || 'Failed to execute command', timedOut })
    })
  })
}

function parseCdTarget(command) {
  const trimmed = command.trim()
  if (!trimmed.startsWith('cd')) return null

  const rest = trimmed.slice(2).trim()
  if (!rest) return '~'
  return rest
}

function resolveTargetDir(currentCwd, target) {
  const workspaceRoot = resolveWorkspaceRoot()
  if (!target || target === '~') return workspaceRoot

  const expanded = target.startsWith('~/')
    ? path.join(workspaceRoot, target.slice(2))
    : target

  return path.resolve(currentCwd, expanded)
}

async function handleClaudeCommand(prompt, fullCommand, session, res) {
  if (!prompt) {
    return res.json({
      ok: true,
      command: fullCommand,
      cwd: session.cwd,
      exitCode: 0,
      timedOut: false,
      stdout: 'Usage: claude <prompt>',
      stderr: ''
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com'
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN

  if (!apiKey && !authToken) {
    return res.json({
      ok: true,
      command: fullCommand,
      cwd: session.cwd,
      exitCode: 1,
      timedOut: false,
      stdout: '',
      stderr: '[ERROR] Claude auth not configured. Set ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN in environment.'
    })
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }

    if (apiKey) {
      headers['x-api-key'] = apiKey
    } else if (authToken) {
      headers['authorization'] = `Bearer ${authToken}`
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data.error?.message || JSON.stringify(data)
      return res.json({
        ok: true,
        command: fullCommand,
        cwd: session.cwd,
        exitCode: 1,
        timedOut: false,
        stdout: '',
        stderr: `[API ERROR] ${response.status}: ${errorMsg}`
      })
    }

    const text = data.content?.[0]?.text || ''
    session.updatedAt = Date.now()

    return res.json({
      ok: true,
      command: fullCommand,
      cwd: session.cwd,
      exitCode: 0,
      timedOut: false,
      stdout: sanitizeOutput(text),
      stderr: ''
    })
  } catch (error) {
    return res.json({
      ok: true,
      command: fullCommand,
      cwd: session.cwd,
      exitCode: 1,
      timedOut: false,
      stdout: '',
      stderr: `[ERROR] ${error.message || 'Failed to call Claude API'}`
    })
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const action = req.body?.action || 'init'

  // For serverless environments, we don't persist sessions across requests.
  // Instead, we create a transient session object for this request.
  let session = null
  const sessionId = req.body?.sessionId || `transient-${Date.now()}`
  const providedCwd = req.body?.cwd

  if (action === 'init') {
    const newSession = createSession()
    return res.json({ ok: true, sessionId: newSession.id, cwd: newSession.cwd })
  }

  // For 'run' and 'reset' actions, create a transient session from provided cwd
  // This works in serverless where session persistence isn't available
  const workspaceRoot = resolveWorkspaceRoot()
  session = {
    id: sessionId,
    cwd: providedCwd && isInsideWorkspace(providedCwd) ? providedCwd : workspaceRoot,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  if (action === 'run') {
    const command = String(req.body?.command || '').trim()
    if (!command) {
      return res.status(400).json({ ok: false, error: 'command is required' })
    }

    // Check for gateway command first
    const gatewayCommand = parseGatewayCommand(command)
    if (gatewayCommand.isGateway) {
      return await handleGatewayCommand(gatewayCommand.prompt, command, session, res)
    }

    const claudeCommand = parseClaudeCommand(command)
    if (claudeCommand.isClaude) {
      return await handleClaudeCommand(claudeCommand.prompt, command, session, res)
    }

    const cdTarget = parseCdTarget(command)
    if (cdTarget !== null) {
      const targetPath = resolveTargetDir(session.cwd, cdTarget)
      if (!isInsideWorkspace(targetPath)) {
        return res.status(400).json({ ok: false, error: 'cd target must stay inside the workspace root' })
      }

      session.cwd = targetPath
      session.updatedAt = Date.now()
      return res.json({
        ok: true,
        command,
        cwd: session.cwd,
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
    }

    const result = await runShellCommand(command, session.cwd)
    session.updatedAt = Date.now()

    return res.json({
      ok: true,
      command,
      cwd: session.cwd,
      exitCode: result.code,
      timedOut: result.timedOut,
      stdout: sanitizeOutput(result.stdout),
      stderr: sanitizeOutput(result.stderr)
    })
  }

  if (action === 'reset') {
    session.cwd = resolveWorkspaceRoot()
    session.updatedAt = Date.now()
    return res.json({ ok: true, sessionId: session.id, cwd: session.cwd })
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' })
}
