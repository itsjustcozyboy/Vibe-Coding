import { useEffect, useMemo, useRef, useState } from 'react'

const INITIAL_LINES = [
  { kind: 'meta', text: 'Workspace terminal ready. Try: pwd, ls, git status, claude Explain this repo' }
]

function lineClassName(kind) {
  if (kind === 'input') return 'terminal-line-input'
  if (kind === 'error') return 'terminal-line-error'
  return 'terminal-line-meta'
}

export default function TerminalPage() {
  const [sessionId, setSessionId] = useState('')
  const [cwd, setCwd] = useState('')
  const [command, setCommand] = useState('')
  const [lines, setLines] = useState(INITIAL_LINES)
  const [isRunning, setIsRunning] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const outputRef = useRef(null)

  const prompt = useMemo(() => `${cwd || '~'} $`, [cwd])

  useEffect(() => {
    async function initSession() {
      const response = await fetch('/api/workspace-terminal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'init' })
      })
      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        setLines((prev) => [...prev, { kind: 'error', text: payload.error || 'Failed to init terminal session' }])
        return
      }
      setSessionId(payload.sessionId)
      setCwd(payload.cwd)
      setLines((prev) => [...prev, { kind: 'meta', text: `Session: ${payload.sessionId}` }])
    }

    initSession()
  }, [])

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines])

  async function runCommand(event) {
    event.preventDefault()

    const raw = command.trim()
    if (!raw || !sessionId || isRunning) return

    setLines((prev) => [...prev, { kind: 'input', text: `${prompt} ${raw}` }])
    setHistory((prev) => [...prev, raw])
    setHistoryIndex(-1)
    setCommand('')
    setIsRunning(true)

    try {
      const response = await fetch('/api/workspace-terminal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'run', sessionId, cwd, command: raw })
      })

      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        setLines((prev) => [...prev, { kind: 'error', text: payload.error || 'Command failed' }])
        return
      }

      setCwd(payload.cwd)
      if (payload.stdout) {
        setLines((prev) => [...prev, { kind: 'output', text: payload.stdout }])
      }
      if (payload.stderr) {
        setLines((prev) => [...prev, { kind: 'error', text: payload.stderr }])
      }

      const exitLabel = payload.timedOut ? 'timeout' : `exit ${payload.exitCode}`
      setLines((prev) => [...prev, { kind: 'meta', text: `[${exitLabel}] cwd=${payload.cwd}` }])
    } catch (error) {
      setLines((prev) => [...prev, { kind: 'error', text: error.message || 'Request failed' }])
    } finally {
      setIsRunning(false)
    }
  }

  async function resetSession() {
    if (!sessionId) return

    const response = await fetch('/api/workspace-terminal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reset', sessionId })
    })

    const payload = await response.json()
    if (!response.ok || !payload.ok) {
      setLines((prev) => [...prev, { kind: 'error', text: payload.error || 'Failed to reset session' }])
      return
    }

    setCwd(payload.cwd)
    setLines((prev) => [...prev, { kind: 'meta', text: 'Session reset to workspace root' }])
  }

  function handleInputKeyDown(event) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (history.length === 0) return

    event.preventDefault()

    if (event.key === 'ArrowUp') {
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(next)
      setCommand(history[next])
      return
    }

    if (historyIndex < 0) return

    const next = historyIndex + 1
    if (next >= history.length) {
      setHistoryIndex(-1)
      setCommand('')
      return
    }

    setHistoryIndex(next)
    setCommand(history[next])
  }

  return (
    <div className="stack">
      <h1 className="page-headline">Workspace Terminal</h1>
      <p className="page-subtitle">
        Web terminal linked to <strong>/workspaces/Vibe-Coding</strong>, with per-session cwd and shell command history.
      </p>

      <section className="card">
        <div className="terminal-window">
          <div className="terminal-head">
            <span>bash session: {sessionId ? sessionId.slice(0, 12) : 'loading...'}</span>
            <span>{cwd || '...'}</span>
          </div>

          <div className="terminal-output" ref={outputRef}>
            {lines.map((line, index) => (
              <div key={`${line.kind}-${index}`} className={lineClassName(line.kind)}>
                {line.text}
              </div>
            ))}
          </div>
        </div>

        <form className="terminal-command-form" onSubmit={runCommand}>
          <input
            className="field"
            placeholder="Type command..."
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={!sessionId || isRunning}
          />
          <button className="btn btn-primary" type="submit" disabled={!sessionId || isRunning}>
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button className="btn" type="button" onClick={resetSession} disabled={!sessionId || isRunning}>
            Reset cwd
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2>Quick Tips</h2>
        <p className="muted">Use up/down arrow for command history. Use cd to move within workspace only.</p>
        <p className="muted">Examples: pwd, ls -la, git status, claude Explain this project</p>
        <p className="muted">The claude command follows the same gateway path as ./scripts/claude-gateway.sh.</p>
      </section>
    </div>
  )
}
