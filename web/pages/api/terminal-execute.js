import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

function parseRuleBasedCommand(input) {
  const text = input.trim()
  const normalized = text.toLowerCase()

  if (normalized === 'help') {
    return {
      actions: [],
      message: '명령 예시: list todos | add todo 제목 | complete todo 3 | uncomplete todo 3 | delete todo 3 | show actions'
    }
  }

  if (normalized === 'list todos') {
    return { actions: [{ type: 'list_todos' }], message: 'Todo 목록을 조회합니다.' }
  }

  if (normalized === 'show actions') {
    return { actions: [{ type: 'list_actions' }], message: 'Claude action 로그를 조회합니다.' }
  }

  if (normalized.startsWith('add todo ')) {
    const title = text.slice(9).trim()
    if (!title) {
      return { actions: [], message: '제목이 비어 있습니다.' }
    }
    return { actions: [{ type: 'create_todo', title }], message: `Todo를 생성합니다: ${title}` }
  }

  if (normalized.startsWith('complete todo ')) {
    const id = Number(text.slice(14).trim())
    if (!Number.isFinite(id)) {
      return { actions: [], message: '유효한 ID를 입력해 주세요.' }
    }
    return { actions: [{ type: 'update_todo_completed', id, completed: true }], message: `Todo #${id}를 완료 처리합니다.` }
  }

  if (normalized.startsWith('uncomplete todo ')) {
    const id = Number(text.slice(16).trim())
    if (!Number.isFinite(id)) {
      return { actions: [], message: '유효한 ID를 입력해 주세요.' }
    }
    return { actions: [{ type: 'update_todo_completed', id, completed: false }], message: `Todo #${id}를 미완료 처리합니다.` }
  }

  if (normalized.startsWith('delete todo ')) {
    const id = Number(text.slice(12).trim())
    if (!Number.isFinite(id)) {
      return { actions: [], message: '유효한 ID를 입력해 주세요.' }
    }
    return { actions: [{ type: 'delete_todo', id }], message: `Todo #${id}를 삭제합니다.` }
  }

  return {
    actions: [],
    message: '해석하지 못한 명령입니다. help 를 입력해 지원 명령을 확인하세요.'
  }
}

async function planWithAnthropic(input) {
  if (!anthropicApiKey) {
    return parseRuleBasedCommand(input)
  }

  const prompt = [
    'You are a planner for a Supabase todo terminal.',
    'Return ONLY JSON with this shape:',
    '{"message":"string","actions":[{"type":"list_todos|create_todo|update_todo_completed|delete_todo|list_actions","id":number,"title":"string","completed":boolean}]}',
    'Rules:',
    '- Use only allowed action types.',
    '- If user asks unsupported operation, return empty actions with explanation message.',
    '- Never include SQL.',
    `User input: ${input}`
  ].join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    return parseRuleBasedCommand(input)
  }

  const payload = await response.json()
  const textChunk = payload?.content?.find?.((x) => x.type === 'text')?.text || ''

  try {
    const parsed = JSON.parse(textChunk)
    if (!parsed || !Array.isArray(parsed.actions)) {
      return parseRuleBasedCommand(input)
    }
    return parsed
  } catch {
    return parseRuleBasedCommand(input)
  }
}

function validateActions(actions) {
  const allowed = new Set([
    'list_todos',
    'create_todo',
    'update_todo_completed',
    'delete_todo',
    'list_actions'
  ])

  return actions.filter((action) => {
    if (!action || typeof action !== 'object') return false
    if (!allowed.has(action.type)) return false
    if (action.type === 'create_todo' && typeof action.title !== 'string') return false
    if (action.type === 'update_todo_completed') {
      return Number.isFinite(Number(action.id)) && typeof action.completed === 'boolean'
    }
    if (action.type === 'delete_todo') {
      return Number.isFinite(Number(action.id))
    }
    return true
  })
}

async function runActions(supabaseAdmin, actions) {
  const results = []

  for (const action of actions) {
    if (action.type === 'list_todos') {
      const { data, error } = await supabaseAdmin
        .from('todos')
        .select('id,title,completed,priority,updated_at')
        .order('id', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      results.push({ type: action.type, data })
      continue
    }

    if (action.type === 'create_todo') {
      const { data, error } = await supabaseAdmin
        .from('todos')
        .insert([{ title: action.title }])
        .select('id,title,completed,priority,updated_at')
        .single()
      if (error) throw new Error(error.message)
      results.push({ type: action.type, data })
      continue
    }

    if (action.type === 'update_todo_completed') {
      const { data, error } = await supabaseAdmin
        .from('todos')
        .update({ completed: action.completed })
        .eq('id', Number(action.id))
        .select('id,title,completed,priority,updated_at')
        .single()
      if (error) throw new Error(error.message)
      results.push({ type: action.type, data })
      continue
    }

    if (action.type === 'delete_todo') {
      const { error } = await supabaseAdmin
        .from('todos')
        .delete()
        .eq('id', Number(action.id))
      if (error) throw new Error(error.message)
      results.push({ type: action.type, data: { id: Number(action.id), deleted: true } })
      continue
    }

    if (action.type === 'list_actions') {
      const { data, error } = await supabaseAdmin
        .from('claude_actions')
        .select('id,text,actor,created_at')
        .order('id', { ascending: false })
        .limit(20)
      if (error) throw new Error(error.message)
      results.push({ type: action.type, data })
    }
  }

  return results
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Supabase server env is missing' })
  }

  const command = typeof req.body?.command === 'string' ? req.body.command : ''
  if (!command.trim()) {
    return res.status(400).json({ error: 'command is required' })
  }

  const plan = await planWithAnthropic(command)
  const safeActions = validateActions(plan.actions || [])
  const supabaseAdmin = createClient(supabaseUrl, serviceKey)

  try {
    const results = await runActions(supabaseAdmin, safeActions)

    await supabaseAdmin.from('claude_actions').insert([
      {
        text: command,
        actor: 'terminal'
      }
    ])

    return res.json({
      ok: true,
      planner: anthropicApiKey ? 'claude' : 'rule-based',
      message: plan.message || '명령이 실행되었습니다.',
      actions: safeActions,
      results
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'command execution failed',
      actions: safeActions
    })
  }
}
