import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding: '2rem', fontFamily: 'system-ui'}}>
      <h1>Vibe Todo / Claude Actions</h1>
      <ul>
        <li><Link href="/auth">Sign in / Sign up</Link></li>
        <li><Link href="/todos">Todos</Link></li>
        <li><Link href="/claude-actions">Claude Actions</Link></li>
      </ul>
    </main>
  )
}
