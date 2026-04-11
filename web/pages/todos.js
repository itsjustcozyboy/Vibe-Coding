import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function TodosPage() {
  const [todos, setTodos] = useState([])
  const [title, setTitle] = useState('')

  useEffect(()=>{
    fetchTodos()
  },[])

  async function fetchTodos(){
    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null
    // If auth.getUser not available in runtime, fallback to public query for demo
    const { data, error } = await supabase.from('todos').select('*').limit(100)
    if (!error) setTodos(data)
  }

  async function createTodo(){
    const { data, error } = await supabase.from('todos').insert([{ title }]).select().single()
    if (!error) {
      setTodos([data, ...todos])
      setTitle('')
    }
  }

  return (
    <main style={{padding: '2rem'}}>
      <h2>Todos</h2>
      <div>
        <input placeholder="title" value={title} onChange={e=>setTitle(e.target.value)} />
        <button onClick={createTodo}>Create</button>
      </div>
      <ul>
        {todos.map(t=> <li key={t.id}>{t.title} {t.completed ? '(done)':''}</li>)}
      </ul>
    </main>
  )
}
