import { useState, useEffect, useRef, useCallback } from 'react'
import { buildQuestionMap, estimateTotal, FREE_END_QUESTION, LAB_QUESTIONS } from '../data/questions'
import { initSession, saveSessionLocal, saveAnswer, updateRespondent, logEvent, assignLab, completeSession, saveEmailLead } from '../lib/session'
import { supabase } from '../lib/supabase'

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

  // Auto-skip inactive questions
  useEffect(() => {
    if (q?.inactive && q?.next) {
      setScreen(q.next)
    }
  }, [screen])

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

  // Load Visual Lab assets from DB as soon as product is known
  useEffect(() => {
    if (!session?.product || v01Assets) return

    supabase
      .from('hc_assets')
      .select('id, variant_type, file_path')
      .eq('product', session.product)
      .eq('active', true)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const assets = data.map(a => ({
            id: a.id,
            label: a.variant_type,
            asset: a.file_path
          }))
          setV01Assets(assets)
        }
      })
  }, [session?.product])

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

      try {
        if (q.type === 'multi') {
          await saveAnswer(session.respondentId, q.id, JSON.stringify(multiAnswer), meta)
        } else if (value !== null && value !== undefined && value !== '') {
          await saveAnswer(session.respondentId, q.id, value, meta)
        }
        await logEvent(session.respondentId, 'question_answered', {
          question_id: q.id, selected_product: session.product, assigned_lab: session.lab
        })
      } catch (e) { console.warn('DB save failed (non-blocking):', e) }
    }

    // Determine next screen
    let next = await resolveNext(value)

    // Update session state
    const newAnswers = { ...session.answers, [q?.id]: value }
    const newSession = { ...session, answers: newAnswers, currentScreen: next }

    // Handle product selection
    try {
      if (q?.id === 'S04' && value) {
        const product = typeof value === 'object' ? value.id : value
        newSession.product = product
        await updateRespondent(session.respondentId, { selected_product: product })
      }
      if (q?.id === 'S03' && value) {
        const optId = typeof value === 'object' ? value.id : value
        const brandStatus = q.brandStatusMap?.[optId]
        if (brandStatus) await updateRespondent(session.respondentId, { brand_status: brandStatus })
      }
    } catch (e) { console.warn('DB update failed:', e) }

    // Handle ROUTER — assign lab
    if (next === 'ROUTER') {
      try {
        const lab = await assignLab(session.respondentId, newSession.product)
        newSession.lab = lab
        const labQuestions = LAB_QUESTIONS[lab]
        next = labQuestions?.[0]?.id || 'D01'
      } catch (e) {
        console.warn('Lab assign failed:', e)
        next = 'D01' // skip lab, go to demography
      }
    }

    // Handle END
    if (next === 'END') {
      newSession.currentScreen = 'END'
      setSession(newSession)
      saveSessionLocal(newSession)
      setScreen('END')
      setSubmitting(false)
      // Complete in background
      completeSession(session.respondentId, newSession.product, newSession.lab, startedAt.current)
      return
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

  if (screen === 'END') return <EndScreen session={session} email={email} setEmail={setEmail} emailSent={emailSent} setEmailSent={setEmailSent} />

  if (!q) {
    setTimeout(() => setScreen('S00'), 100)
    return (
      <div className="hc-app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--hc-muted)', fontSize: 16 }}>Načítáme…</div>
      </div>
    )
  }

  return (
    <div className="hc-app">
      <header className="hc-header">
        <div className="hc-header-row">
          <a className="hc-logo" href="https://hellococo.cz" target="_blank" rel="noopener">
            <img src="/assets/hello-coco-logo.png" alt="hello coco" />
          </a>
          <span className="hc-step-badge">{currentStep} / {totalSteps}</span>
        </div>
        <div className="hc-progress">
          <span className="hc-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="hc-screen">
        {q.type === 'intro' ? (
          <IntroScreen q={q} onStart={() => {
            setScreen('S01')
            if (session?.respondentId) logEvent(session.respondentId, 'survey_started', {})
          }} />
        ) : (
          <div className="hc-card">
            {q.stepLabel && <p className="hc-step">{q.stepLabel}</p>}
            <h1 className="hc-question">{q.question}</h1>
            {q.helper && <p className="hc-helper">{q.helper}</p>}

            {q.showProductImage && (
              <img src={q.showProductImage} alt="" style={{ width: '100%', maxWidth: 180, borderRadius: 14, margin: '0 auto 18px', display: 'block' }} />
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
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 32, fontWeight: 700 }}>
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
                      onClick={() => { setAnswer(opt); setTimeout(() => handleNext(opt), 120) }}
                    >
                      <span className="hc-option-radio" />
                      <span className="hc-option-label">{opt.label}</span>
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

              {q.type === 'timed_grid' && (
                <div className="hc-image-grid" style={{ pointerEvents: 'none' }}>
                  {v01Assets
                    ? v01Assets.map(opt => (
                        <div key={opt.id} className="hc-image-option" style={{ cursor: 'default' }}>
                          <img src={opt.asset} alt={opt.label} />
                        </div>
                      ))
                    : <div style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 40 }}>Načítáme obrázky…</div>
                  }
                </div>
              )}

              {q.type === 'image_single' && !q.inactive && (
                <div className="hc-image-grid">
                  {q.sameAsV01 && !v01Assets && (
                    <div style={{ color: 'var(--hc-muted)', textAlign: 'center', padding: 40 }}>Načítáme obrázky…</div>
                  )}
                  {(q.sameAsV01 ? v01Assets : orderedOptions(q.options))?.filter(o => o.asset).map(opt => (
                    <button
                      key={opt.id}
                      className={`hc-image-option ${answer?.id === opt.id ? 'selected' : ''}`}
                      onClick={() => { setAnswer(opt); setTimeout(() => handleNext(opt), 100) }}
                    >
                      <img src={opt.asset} alt={opt.label} />
                    </button>
                  ))}
                  {!q.sameAsV01 && orderedOptions(q.options)?.filter(o => !o.asset).map(opt => (
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
    <div className="hc-intro">
      <div className="hc-intro-card">
        <div className="hc-intro-logo-area">
          <img className="hc-intro-logo" src="/assets/hello-coco-logo.png" alt="hello coco" />
          <div className="hc-intro-divider" />
          <div className="hc-intro-tag">Customer Lab · Praha 2026</div>
          <h1 className="hc-intro-h1">{q.headline}</h1>
          <p className="hc-intro-sub">{q.body}</p>
        </div>
        <div className="hc-intro-meta">
          <div className="hc-meta-pill">~3 min<span>délka</span></div>
          <div className="hc-meta-pill">Anonymní<span>data</span></div>
          <div className="hc-meta-pill">20% sleva<span>odměna</span></div>
        </div>
        <div className="hc-intro-cta">
          <button className="hc-primary" onClick={onStart}>{q.cta}</button>
        </div>
      </div>
    </div>
  )
}

function EndScreen({ session, email, setEmail, emailSent, setEmailSent }) {
  const [saving, setSaving] = useState(false)

  async function handleEmail() {
    if (!email.includes('@')) return
    setSaving(true)
    try { await saveEmailLead(session.respondentId, email) } catch (e) { console.warn(e) }
    setEmailSent(true)
    setSaving(false)
  }

  return (
    <div className="hc-app">
      <header className="hc-header">
        <div className="hc-header-row">
          <div className="hc-logo"><img src="/assets/hello-coco-logo.png" alt="hello coco" /></div>
          <span className="hc-step-badge">Hotovo</span>
        </div>
        <div className="hc-progress"><span className="hc-progress__bar" style={{ width: '100%' }} /></div>
      </header>
      <main className="hc-screen">
        <div className="hc-end-hero">
          <img className="hc-end-logo" src="/assets/hello-coco-logo.png" alt="hello coco" />
          <h1 className="hc-end-h1">Děkujeme za tvůj čas.</h1>
          <p className="hc-end-sub">Tvoje odpovědi nám pomůžou dělat produkty a komunikaci, které dávají lidem větší smysl.</p>
        </div>
        <div className="hc-card">
          {!emailSent ? (
            <>
              <div className="hc-discount-box">
                <div className="hc-discount-label">Odměna za vyplnění</div>
                <div className="hc-discount-code">PRAHA20</div>
                <div className="hc-discount-note">20 % sleva · platí celý rok na hellococo.cz</div>
              </div>
              <input
                type="email"
                className="hc-email-input"
                placeholder="tvuj@email.cz"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <div className="hc-actions">
                <button className="hc-primary" onClick={handleEmail} disabled={saving || !email.includes('@')}>
                  {saving ? 'Odesíláme…' : 'Poslat kód na email'}
                </button>
                <button className="hc-skip" onClick={() => setEmailSent(true)}>Nechci slevu, díky</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              {email
                ? <p style={{ fontSize: 15, color: '#2E7D32', fontWeight: 700 }}>Kód PRAHA20 jsme ti poslali na {email}</p>
                : <p style={{ fontSize: 14, color: 'var(--muted)' }}>Kód: <strong style={{color:'var(--purple)'}}>PRAHA20</strong> — 20 % sleva platí celý rok na hellococo.cz</p>
              }
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
