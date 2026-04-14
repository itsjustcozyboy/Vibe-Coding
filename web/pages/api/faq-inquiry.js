function getInquiryStore() {
  if (!globalThis.__faqInquiryStore) {
    globalThis.__faqInquiryStore = []
  }
  return globalThis.__faqInquiryStore
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const title = String(req.body?.title || '').trim()
  const email = String(req.body?.email || '').trim()
  const message = String(req.body?.message || '').trim()

  if (!title || !email || !message) {
    return res.status(400).json({ ok: false, error: 'title, email, message are required' })
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'invalid email format' })
  }

  const store = getInquiryStore()
  const inquiry = {
    id: `inq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    email,
    message,
    createdAt: new Date().toISOString()
  }

  store.push(inquiry)

  return res.status(201).json({
    ok: true,
    inquiry: {
      id: inquiry.id,
      createdAt: inquiry.createdAt
    }
  })
}
