import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export default function ClaudeActionsPage(){
  const [actions, setActions] = useState([])

  useEffect(()=>{
    if (isSupabaseConfigured) {
      fetchActions()
    }
  },[])

  async function fetchActions(){
    if (!supabase) return
    const { data, error } = await supabase.from('claude_actions').select('*').order('created_at', {ascending:false}).limit(100)
    if (!error) setActions(data)
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Claude Actions</h2>
      {!isSupabaseConfigured && (
        <p>NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 먼저 설정해 주세요.</p>
      )}
      <ul>
        {actions.map(a => (
          <li key={a.id}>{new Date(a.created_at).toLocaleString()} — {a.text}</li>
        ))}
      </ul>
    </main>
  )
}
