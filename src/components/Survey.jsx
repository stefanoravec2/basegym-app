import { useState, useEffect, useRef, useCallback } from 'react'
import { buildQuestionMap, estimateTotal, FREE_END_QUESTION, LAB_QUESTIONS } from '../data/questions'
import { initSession, saveSessionLocal, saveAnswer, updateRespondent, logEvent, assignLab, completeSession, saveEmailLead } from '../lib/session'

const QMap = buildQuestionMap()

export default function Survey() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('S00')
  const [answer, setAnswer] = useState(null)
  const [multiAnswer, setMultiAnswer] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timedDone, setTimedDone] = useState(false)
  const [timerLeft, setTimerLeft] = useState(null)
  const [shownOrder, setShownOrder] = useState(null)
  const [v01Assets, setV01Assets] = useState(null) // for Visual Lab carry-through
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const startedAt = useRef(Date.now())
  const questionStartedAt = useRef(Date.now())

  useEffect(() => {
    initSession().then(s => {
      setSession(s)
      setScreen(s.currentScreen || 'S00')
      setLoading(false)
    }).catch(e => {
      console.error('Session init error:', e)
      // Fallback — funguj aj bez DB
      const fallback = { respondentId: crypto.randomUUID(), currentScreen: 'S00', answers: {}, product: null, lab: null }
      setSession(fallback)
      setScreen('S00')
      setLoading(false)
    })
  }, [])

  const q = QMap[screen]
  const totalSteps = session ? estimateTotal(session.product, session.lab) : 30
  const currentStep = Object.keys(session?.answers || {}).length
  const progress = Math.min(100, Math.round((currentStep / totalSteps) * 100))

  // Randomize options when screen changes
  useEffect(() => {
    if (!q) return
    setAnswer(null)
    setMultiAnswer([])
    setTimedDone(false)
    setTimerLeft(null)
    questionStartedAt.current = Date.now()

    if (q.randomize && q.options) {
      const shuffled = [...q.options].sort(() => Math.random() - 0.5)
      setShownOrder(shuffled.map(o => o.id))
    } else {
      setShownOrder(q.options?.map(o => o.id) || null)
    }
  }, [screen])

  // Timed visual handler
  useEffect(() => {
    if (!q || (q.type !== 'timed_grid' && q.type !== 'timed_single' && q.type !== 'timed_textarea')) return
    if (!q.duration) return

    const ms = q.duration
    setTimerLeft(Math.ceil(ms / 1000))
    const interval = setInterval(() => setTimerLeft(t => t - 1), 1000)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setTimedDone(true)
      setTimerLeft(null)
      if (q.type === 'timed_grid') {
        // auto-advance after 2s
        setTimeout(() => handleNext(null, true), 200)
      }
    }, ms)
    return () => { clearTimeout(timeout); clearInterval(interval) }
  }, [screen])

  const orderedOptions = useCallback((options) => {
    if (!shownOrder || !options) return options
    return shownOrder.map(id => options.find(o => o.id === id)).filter(Boolean)
  }, [shownOrder])

  async function handleNext(val, skipSave = false) {
    if (submitting) return
    setSubmitting(true)

    const value = val !== undefined ? val : answer
    const timeTaken = Date.now() - questionStartedAt.current

    if (!skipSave && q && q.type !== 'intro' && q.type !== 'end') {
      const meta = {
        answer_time_ms: timeTaken,
        voc_tag: q.voc_tag || null,
        analysis_dimension: q.analysis_dimension || null,
        shown_options_json: shownOrder ? JSON.stringify(shownOrder) : null
      }

      if (q.type === 'multi') {
        const selected = multiAnswer
        meta.shown_options_json = JSON.stringify(shownOrder)
        await saveAnswer(session.respondentId, q.id, JSON.stringify(selected), meta)
      } else if (value !== null && value !== undefined && value !== '') {
        await saveAnswer(session.respondentId, q.id, value, meta)
      }

      // Log event
      await logEvent(session.respondentId, 'question_answered', {
        question_id: q.id, selected_product: session.product, assigned_lab: session.lab
      })
    } else if (value === null || value === undefined || value === '') {
      await logEvent(session.respondentId, 'question_skipped', {
        question_id: q?.id, selected_product: session.product, assigned_lab: session.lab
      })
    }

    // Determine next screen
    let next = await resolveNext(value)

    // Update session state
    const newAnswers = { ...session.answers, [q?.id]: value }
    const newSession = { ...session, answers: newAnswers, currentScreen: next }

    // Handle product selection
    if (q?.id === 'S04' && value) {
      const product = typeof value === 'object' ? value.id : value
      newSession.product = product
      await updateRespondent(session.respondentId, { selected_product: product })
      await logEvent(session.respondentId, 'product_selected', { selected_product: product })
    }

    // Handle brand status from S03
    if (q?.id === 'S03' && value) {
      const optId = typeof value === 'object' ? value.id : value
      const brandStatus = q.brandStatusMap?.[optId]
      if (brandStatus) await updateRespondent(session.respondentId, { brand_status: brandStatus })
    }

    // Handle ROUTER — assign lab
    if (next === 'ROUTER') {
      const lab = await assignLab(session.respondentId, newSession.product)
      newSession.lab = lab
      const labQuestions = LAB_QUESTIONS[lab]
      next = labQuestions?.[0]?.id || 'DEMOGRAPHY'
    }

    // Handle END
    if (next === 'END') {
      await completeSession(session.respondentId, newSession.product, newSession.lab, startedAt.current)
    }

    newSession.currentScreen = next
    setSession(newSession)
    saveSessionLocal(newSession)
    setScreen(next)
    setSubmitting(false)
  }

  async function resolveNext(value) {
    if (!q) return 'S00'

    // FREE_END injected before ROUTER
    if (q.next === 'FREE_END') return 'FREE_END'
    if (q.id === 'FREE_END') return 'ROUTER'

    // Branch
    if (q.branch && value) {
      const key = typeof value === 'object' ? value.id : value
      return q.branch[key] || q.next
    }
    return q.next || 'END'
  }

  async function handleSkip() {
    await logEvent(session.respondentId, 'question_skipped', { question_id: q?.id })
    let next = await resolveNext(null)
    if (next === 'FREE_END') next = 'FREE_END'
    if (next === 'ROUTER') {
      const lab = await assignLab(session.respondentId, session.product)
      const newSession = { ...session, lab, currentScreen: 'DEMOGRAPHY' }
      setSession(newSession)
      saveSessionLocal(newSession)
      const labQuestions = LAB_QUESTIONS[lab]
      setScreen(labQuestions?.[0]?.id || 'DEMOGRAPHY')
      return
    }
    setScreen(next)
  }

  if (loading) return (
    <div className="hc-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--hc-muted)', fontSize: 16 }}>Načítáme…</div>
    </div>
  )

  if (!q) {
    // Screen ID not found — reset to S00
    setTimeout(() => setScreen('S00'), 100)
    return (
      <div className="hc-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--hc-muted)', fontSize: 16 }}>Načítáme…</div>
      </div>
    )
  }

  if (screen === 'END') return <EndScreen session={session} email={email} setEmail={setEmail} emailSent={emailSent} setEmailSent={setEmailSent} />

  return (
    <div className="hc-app">
      <header className="hc-header">
        <a className="hc-logo" href="https://hellococo.cz" target="_blank" rel="noopener">
          <img src="/assets/hello-coco-logo.png" alt="hello coco" />
        </a>
        <div className="hc-progress">
          <span className="hc-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="hc-screen">
        {q.type === 'intro' ? (
          <IntroScreen q={q} onStart={() => {
            setScreen('S01')
            // Log start event in background
            if (session?.respondentId) logEvent(session.respondentId, 'survey_started', {})
          }} />
        ) : (
          <div className="hc-card">
            {q.stepLabel && <p className="hc-step">{q.stepLabel}</p>}
            <h1 className="hc-question">{q.question}</h1>
            {q.helper && <p className="hc-helper">{q.helper}</p>}

            {q.showProductImage && (
              <img src={q.showProductImage} alt="" style={{ width: '100%', maxWidth: 200, borderRadius: 16, margin: '0 auto 20px', display: 'block' }} />
            )}

            <div className="hc-answer">
              {q.type === 'textarea' && (
                <textarea
                  className="hc-textarea"
                  placeholder={q.placeholder || 'Stačí pár slov…'}
                  value={answer || ''}
                  onChange={e => setAnswer(e.target.value)}
                  rows={3}
                />
              )}

              {(q.type === 'timed_textarea') && (
                timedDone ? (
                  <textarea
                    className="hc-textarea"
                    placeholder={q.placeholder || 'Stačí pár slov…'}
                    value={answer || ''}
                    onChange={e => setAnswer(e.target.value)}
                    rows={3}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--hc-muted)' }}>
                    {timerLeft}
                  </div>
                )
              )}

              {q.type === 'single' && (
                <div className="hc-options">
                  {orderedOptions(q.options)?.map(opt => (
                    <button
                      key={opt.id}
                      className={`hc-option ${answer?.id === opt.id ? 'selected' : ''}`}
                      onClick={() => { setAnswer(opt); setTimeout(() => handleNext(opt), 100) }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'multi' && (
                <>
                  {q.maxSelect && <p className="hc-chip-hint">Vyber až {q.maxSelect}.</p>}
                  <div className="hc-chips">
                    {orderedOptions(q.options)?.map(opt => {
                      const sel = multiAnswer.includes(opt.id)
                      return (
                        <button
                          key={opt.id}
                          className={`hc-chip ${sel ? 'selected' : ''}`}
                          onClick={() => {
                            if (sel) setMultiAnswer(m => m.filter(x => x !== opt.id))
                            else if (!q.maxSelect || multiAnswer.length < q.maxSelect) setMultiAnswer(m => [...m, opt.id])
                          }}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {q.type === 'image_single' && !q.inactive && (
                <div className="hc-image-grid">
                  {orderedOptions(q.options)?.filter(o => o.asset || !q.options.some(x => x.asset)).map(opt => (
                    opt.asset ? (
                      <button
                        key={opt.id}
                        className={`hc-image-option ${answer?.id === opt.id ? 'selected' : ''}`}
                        onClick={() => { setAnswer(opt); setTimeout(() => handleNext(opt), 100) }}
                      >
                        <img src={opt.asset} alt={opt.label} />
                        {opt.label && <span>{opt.label}</span>}
                      </button>
                    ) : (
                      <button
                        key={opt.id}
                        className={`hc-option ${answer?.id === opt.id ? 'selected' : ''}`}
                        onClick={() => { setAnswer(opt); setTimeout(() => handleNext(opt), 100) }}
                      >
                        {opt.label}
                      </button>
                    )
                  ))}
                </div>
              )}

              {q.type === 'scale' && (
                <>
                  <div className="hc-scale">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        className={`hc-scale-btn ${answer === n ? 'selected' : ''}`}
                        onClick={() => setAnswer(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="hc-scale-labels">
                    <span>{q.labelMin}</span>
                    <span>{q.labelMax}</span>
                  </div>
                </>
              )}

              {q.type === 'number' && (
                <>
                  <input
                    type="number"
                    className="hc-number-input"
                    placeholder="0"
                    value={answer || ''}
                    onChange={e => setAnswer(e.target.value ? Number(e.target.value) : '')}
                  />
                  {q.suffix && <p className="hc-number-suffix">{q.suffix}</p>}
                </>
              )}
            </div>

            <div className="hc-actions">
              {(q.type === 'textarea' || q.type === 'timed_textarea' || q.type === 'scale' || q.type === 'number' || q.type === 'multi') && (
                <button
                  className="hc-primary"
                  disabled={submitting || (q.required && !hasValue(q, answer, multiAnswer))}
                  onClick={() => handleNext(q.type === 'multi' ? multiAnswer : answer)}
                >
                  {submitting ? 'Ukládáme…' : 'Pokračovat'}
                </button>
              )}
              {!q.required && (
                <button className="hc-skip" onClick={handleSkip} disabled={submitting}>
                  Přeskočit
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function hasValue(q, answer, multiAnswer) {
  if (q.type === 'multi') return multiAnswer.length > 0
  if (q.type === 'scale') return answer !== null && answer !== undefined
  if (q.type === 'number') return answer !== '' && answer !== null
  return answer && String(answer).trim().length > 0
}

function IntroScreen({ q, onStart }) {
  return (
    <div className="hc-intro" style={{ paddingTop: 60 }}>
      <div className="hc-intro-badge">hello coco · Customer Lab</div>
      <h1>{q.headline}</h1>
      <p>{q.body}</p>
      <button className="hc-primary" style={{ maxWidth: 320 }} onClick={onStart}>
        {q.cta}
      </button>
    </div>
  )
}

function EndScreen({ session, email, setEmail, emailSent, setEmailSent }) {
  const [saving, setSaving] = useState(false)

  async function handleEmail() {
    if (!email.includes('@')) return
    setSaving(true)
    await saveEmailLead(session.respondentId, email)
    setEmailSent(true)
    setSaving(false)
  }

  return (
    <div className="hc-app">
      <header className="hc-header">
        <a className="hc-logo"><img src="/assets/hello-coco-logo.png" alt="hello coco" /></a>
        <div className="hc-progress"><span className="hc-progress__bar" style={{ width: '100%' }} /></div>
      </header>
      <main className="hc-screen">
          <div className="hc-card" style={{ marginTop: 40, textAlign: 'center' }}>
          <div className="hc-end-icon">🙌</div>
          <h1 className="hc-question">Děkujeme!</h1>
          <p className="hc-helper">
            Tvoje odpovědi nám pomůžou dělat produkty a komunikaci, které dávají lidem větší smysl.
          </p>

          {!emailSent ? (
            <>
              <div className="hc-discount-box">
                <p style={{ fontSize: 14, color: 'var(--hc-muted)', marginBottom: 6 }}>Jako poděkování dostaneš</p>
                <div className="hc-discount-code">PRAHA20</div>
                <p style={{ fontSize: 14, color: 'var(--hc-muted)', marginTop: 6 }}>20% sleva na celý rok</p>
              </div>
              <p style={{ fontSize: 15, color: 'var(--hc-muted)', marginBottom: 16 }}>
                Zadej svůj email a pošleme ti kód přímo:
              </p>
              <input
                type="email"
                className="hc-email-input"
                placeholder="tvuj@email.cz"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="hc-primary" onClick={handleEmail} disabled={saving || !email.includes('@')}>
                {saving ? 'Odesíláme…' : 'Poslat kód na email'}
              </button>
              <button className="hc-skip" onClick={() => setEmailSent(true)}>
                Nechci slevu, díky
              </button>
            </>
          ) : (
            <div style={{ padding: '20px 0' }}>
              {email ? (
                <p style={{ fontSize: 16, color: 'var(--hc-success)', fontWeight: 600 }}>
                  ✓ Kód PRAHA20 jsme ti poslali na {email}
                </p>
              ) : (
                <p style={{ fontSize: 15, color: 'var(--hc-muted)' }}>Kód: <strong>PRAHA20</strong> — 20% sleva platí celý rok na hellococo.cz</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
