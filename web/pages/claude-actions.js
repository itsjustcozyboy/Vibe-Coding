import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ClaudeActionsPage(){
  const [actions, setActions] = useState([])

  useEffect(()=>{ fetchActions() },[])

  async function fetchActions(){
    const { data, error } = await supabase.from('claude_actions').select('*').order('created_at', {ascending:false}).limit(100)
    if (!error) setActions(data)
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Claude Actions</h2>
      <ul>
        {actions.map(a => (
          <li key={a.id}>{new Date(a.created_at).toLocaleString()} — {a.text}</li>
        ))}
      </ul>
    </main>
  )
}
