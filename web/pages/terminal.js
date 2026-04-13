import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

function formatRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '(empty)'
  return rows
    .map((row) => {
      const cells = Object.entries(row).map(([key, value]) => `${key}=${String(value)}`)
      return `- ${cells.join(' | ')}`
    })
    .join('\n')
}

export default function TerminalPage() {
  const [command, setCommand] = useState('list todos')
  const [logs, setLogs] = useState([
    { type: 'info', text: 'Claude Terminal 시작됨. help 를 입력해 사용법 확인.' }
  ])
  const [todos, setTodos] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const canRun = useMemo(() => isSupabaseConfigured && !isRunning, [isRunning])

  async function refreshTodos() {
    if (!supabase) return
    const { data, error } = await supabase
      .from('todos')
      .select('id,title,completed,priority,updated_at')
      .order('id', { ascending: false })
      .limit(20)
    if (!error) setTodos(data || [])
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    refreshTodos()

    const channel = supabase
      .channel('terminal-todos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        () => {
          refreshTodos()
          setLogs((prev) => [
            ...prev,
            { type: 'event', text: 'realtime: todos 테이블 변경 감지' }
          ])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function runCommand(event) {
    event.preventDefault()

    if (!command.trim()) return

    const raw = command
    setLogs((prev) => [...prev, { type: 'input', text: `$ ${raw}` }])
    setCommand('')
    setIsRunning(true)

    try {
      const response = await fetch('/api/terminal-execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ command: raw })
      })
      const payload = await response.json()

      if (!response.ok || !payload.ok) {
        setLogs((prev) => [
          ...prev,
          { type: 'error', text: payload.error || '명령 실행 실패' }
        ])
        return
      }

      const summary = payload.message || '명령 실행 완료'
      const detail = payload.results
        .map((item) => `# ${item.type}\n${formatRows(Array.isArray(item.data) ? item.data : [item.data])}`)
        .join('\n')

      setLogs((prev) => [
        ...prev,
        { type: 'output', text: `[planner=${payload.planner}] ${summary}` },
        { type: 'output', text: detail || '(no output)' }
      ])
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: error.message || '요청 실패' }
      ])
    } finally {
      setIsRunning(false)
      refreshTodos()
    }
  }

  return (
    <main style={{ padding: '1.25rem', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Claude DB Terminal</h1>
      <p style={{ marginTop: 0 }}>
        단일 터미널에서 명령을 입력하면 Claude(또는 rule-based planner)가 Supabase DB 액션으로 변환해 실행합니다.
      </p>
      <p>
        <Link href="/">홈으로</Link>
      </p>

      {!isSupabaseConfigured && (
        <p style={{ color: '#b91c1c' }}>
          NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.
        </p>
      )}

      <section
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 8,
          background: '#0b1020',
          color: '#d1fae5',
          padding: '1rem',
          minHeight: 320,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap'
        }}
      >
        {logs.map((line, index) => (
          <div key={`${line.type}-${index}`} style={{ marginBottom: 8 }}>
            {line.text}
          </div>
        ))}
      </section>

      <form onSubmit={runCommand} style={{ marginTop: '1rem', display: 'flex', gap: 8 }}>
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder="예: add todo 내일 배포 체크"
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: 8
          }}
        />
        <button
          type="submit"
          disabled={!canRun}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            border: 'none',
            background: canRun ? '#1d4ed8' : '#94a3b8',
            color: 'white'
          }}
        >
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </form>

      <section style={{ marginTop: '1rem' }}>
        <h2>실시간 Todo 미리보기</h2>
        <pre
          style={{
            background: '#f1f5f9',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '0.75rem',
            whiteSpace: 'pre-wrap'
          }}
        >
          {formatRows(todos)}
        </pre>
      </section>

      <section style={{ marginTop: '1rem' }}>
        <h2>지원 명령</h2>
        <ul>
          <li>help</li>
          <li>list todos</li>
          <li>add todo 할일 제목</li>
          <li>complete todo 1</li>
          <li>uncomplete todo 1</li>
          <li>delete todo 1</li>
          <li>show actions</li>
        </ul>
      </section>
    </main>
  )
}
