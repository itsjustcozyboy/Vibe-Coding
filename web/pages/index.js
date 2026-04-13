import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding: '2rem', fontFamily: 'system-ui'}}>
      <h1>Vibe Todo / Claude Console</h1>
      <ul>
        <li><Link href="/terminal">Claude Terminal (실시간 DB 제어)</Link></li>
        <li><Link href="/auth">Sign in / Sign up</Link></li>
        <li><Link href="/todos">Todos</Link></li>
        <li><Link href="/claude-actions">Claude Actions</Link></li>
      </ul>
    </main>
  )
}
