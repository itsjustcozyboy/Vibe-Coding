import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase server env is missing' })
  }

  const { text, board_id, dry_run, actor } = req.body
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text is required' })

  if (dry_run) return res.json({ ok: true, simulated: true })

  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabaseAdmin.from('claude_actions').insert([{ text, board_id: board_id || 1, actor: actor || 'claude' }]).select('id,created_at').single()
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ ok: true, result: data })
}
