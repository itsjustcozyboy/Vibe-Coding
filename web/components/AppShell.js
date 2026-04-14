import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/terminal', label: 'Terminal' },
  { href: '/faq', label: 'FAQ' }
]

export default function AppShell({ children }) {
  const router = useRouter()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="brand-kicker">Workspace</p>
          <h1 className="brand-title">Vibe Console</h1>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = router.pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? 'app-nav-link active' : 'app-nav-link'}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <div className="app-main-wrap">
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
