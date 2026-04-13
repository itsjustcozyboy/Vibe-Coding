import { useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function signUp() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Supabase 환경변수가 설정되지 않았습니다.')
      return
    }

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Check your email for confirmation (if enabled)')
  }

  async function signIn() {
    if (!isSupabaseConfigured || !supabase) {
      setMessage('Supabase 환경변수가 설정되지 않았습니다.')
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Signed in')
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Sign in / Sign up</h2>
      {!isSupabaseConfigured && (
        <p>NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 먼저 설정해 주세요.</p>
      )}
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div style={{marginTop: '0.5rem'}}>
        <button onClick={signIn}>Sign in</button>
        <button onClick={signUp} style={{marginLeft: '0.5rem'}}>Sign up</button>
      </div>
      <p>{message}</p>
    </main>
  )
}
