import '../styles/globals.css'
import AppShell from '../components/AppShell'

export default function App({ Component, pageProps }) {
  return (
    <AppShell>
      <Component {...pageProps} />
    </AppShell>
  )
}
