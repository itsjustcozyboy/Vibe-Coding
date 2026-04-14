import Link from 'next/link'

export default function Home() {
  return (
    <div className="stack">
      <section className="hero-panel">
        <p className="hero-kicker">Vibe Coding</p>
        <h1 className="page-headline">Simple Workspace Home</h1>
        <p className="page-subtitle">
          Fast access to terminal and support FAQ.
        </p>
      </section>

      <section className="card stack">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/terminal" className="btn btn-primary">Terminal</Link>
          <Link href="/faq" className="btn">FAQ</Link>
        </div>
      </section>
    </div>
  )
}
