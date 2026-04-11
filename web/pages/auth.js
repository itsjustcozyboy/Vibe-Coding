import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function signUp() {
    const { user, error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Check your email for confirmation (if enabled)')
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Signed in')
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Sign in / Sign up</h2>
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
