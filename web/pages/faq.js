import { useState } from 'react'

const FAQ_ITEMS = [
  {
    question: '터미널에서 어떤 명령을 실행할 수 있나요?',
    answer: '워크스페이스 경로 안에서 bash 명령을 실행할 수 있습니다. 예: pwd, ls, git status.'
  },
  {
    question: '왜 일부 명령은 실패하나요?',
    answer: '세션 권한, 경로 제한, 또는 명령 자체 오류로 실패할 수 있습니다. 출력 로그를 확인해 주세요.'
  },
  {
    question: '문의는 어디로 보내면 되나요?',
    answer: '아래 문의 폼으로 제목/이메일/내용을 보내주세요.'
  }
]

export default function FaqPage() {
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submitInquiry(event) {
    event.preventDefault()
    if (!title.trim() || !email.trim() || !message.trim()) {
      setStatus('제목, 이메일, 내용을 모두 입력해 주세요.')
      return
    }

    setIsSubmitting(true)
    setStatus('')

    try {
      const response = await fetch('/api/faq-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, email, message })
      })

      const payload = await response.json()
      if (!response.ok || !payload.ok) {
        setStatus(payload.error || '문의 접수에 실패했습니다.')
        return
      }

      setStatus(`문의가 접수되었습니다. 접수번호: ${payload.inquiry.id}`)
      setTitle('')
      setEmail('')
      setMessage('')
    } catch (error) {
      setStatus(error.message || '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <h1 className="page-headline">FAQ & 문의</h1>
      <p className="page-subtitle">자주 묻는 질문을 확인하고 문의를 남겨주세요.</p>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>자주 묻는 질문</h2>
        {FAQ_ITEMS.map((item) => (
          <details key={item.question} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '0.65rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{item.question}</summary>
            <p className="muted" style={{ marginBottom: 0 }}>{item.answer}</p>
          </details>
        ))}
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>문의 접수</h2>
        <form className="stack" onSubmit={submitInquiry}>
          <input
            className="field"
            placeholder="제목"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <input
            className="field"
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <textarea
            className="field"
            placeholder="문의 내용을 입력해 주세요"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            style={{ resize: 'vertical' }}
          />
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '접수 중...' : '문의 보내기'}
          </button>
        </form>
        {status && <p className="muted" style={{ margin: 0 }}>{status}</p>}
      </section>
    </div>
  )
}
