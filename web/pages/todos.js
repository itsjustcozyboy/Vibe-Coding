import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export default function TodosPage() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')

  useEffect(()=>{
    if (isSupabaseConfigured) {
      fetchTodos()
    }
  },[])

  async function fetchTodos(){
    if (!supabase) return
    const { data, error } = await supabase.from('todos').select('*').limit(100)
    if (!error) setTodos(data)
  }

  async function createTodo(){
    if (!supabase) return
    if (!title.trim()) return

    const { data, error } = await supabase.from('todos').insert([{ title }]).select().single()
    if (!error) {
      setTodos([data, ...todos])
      setTitle('')
    }
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Todos</h2>
      {!isSupabaseConfigured && (
        <p>NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 먼저 설정해 주세요.</p>
      )}
      <div>
        <input placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} />
        <button disabled={!isSupabaseConfigured} onClick={createTodo}>Create</button>
      </div>
      <ul>
        {todos.map(t=> <li key={t.id}>{t.title} {t.completed ? '(done)':''}</li>)}
      </ul>
    </main>
  )
}
