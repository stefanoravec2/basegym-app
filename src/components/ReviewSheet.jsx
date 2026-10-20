import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://njkxzbwzmhovuzuoyndj.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTgxOTgsImV4cCI6MjA5MTUzNDE5OH0.FmZldAabAE5Ac9YebKfiwwtzlC6ScRL77wJhTgZ6hjk'

async function apiFetch(user, path, options = {}) {
  const idToken = await user.getIdToken()
  return fetch(`${SUPABASE_URL}/functions/v1/training-review/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'apikey': SUPABASE_ANON,
      ...(options.headers || {}),
    },
  })
}

const DISMISSED_KEY = 'basegym_review_dismissed'

export default function ReviewSheet({ user }) {
  const [session, setSession] = useState(null)   // { id, trainer_name }
  const [stars, setStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user) return
    checkPendingReview()
  }, [user])

  async function checkPendingReview() {
    try {
      // Check if user already dismissed recently
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed && Date.now() - Number(dismissed) < 4 * 60 * 60 * 1000) {
        setChecked(true)
        return
      }

      const res = await apiFetch(user, 'pending-review')
      if (!res.ok) { setChecked(true); return }
      const data = await res.json()
      // Edge function returns { pending: session } or { session: ... }
      const sess = data.session || data.pending
      if (sess) {
        setSession({
          id: sess.id,
          trainer_name: sess.profiles?.full_name || null,
        })
      }
    } catch (e) {
      console.warn('Review check failed:', e)
    } finally {
      setChecked(true)
    }
  }

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
    setSession(null)
  }

  async function submitReview() {
    if (stars === 0) return
    setSubmitting(true)
    try {
      const res = await apiFetch(user, 'submit-review', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id, stars, comment: comment.trim() || null }),
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => { setSession(null); setDone(false) }, 2500)
      }
    } catch (e) {
      console.warn('Submit review failed:', e)
    } finally {
      setSubmitting(false)
    }
  }

  if (!checked || !session) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 990, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderRadius: '20px 20px 0 0',
        padding: '24px 24px 40px', zIndex: 1000,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
        maxWidth: '680px', margin: '0 auto',
        animation: 'slideUp 0.25s ease-out',
      }}>
        {/* Close */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: '#f0f0f0', border: 'none', borderRadius: '50%',
            width: '32px', height: '32px', cursor: 'pointer',
            fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#555',
          }}
        >×</button>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🙏</div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>Ďakujeme za hodnotenie!</div>
            <div style={{ fontSize: '14px', color: '#666' }}>Vaša spätná väzba nám pomáha rásť.</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏋️</div>
              <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Ďakujeme, že na sebe pracuješ!</div>
              <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                Ako si dnes bol/a spokojný/á s tréningom{session.trainer_name ? ` u ${session.trainer_name}` : ''}?
              </div>
            </div>

            {/* Stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setStars(s)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: stars >= s ? '36px' : '32px',
                    filter: stars >= s ? 'none' : 'grayscale(1) opacity(0.35)',
                    transition: 'all 0.1s',
                    transform: stars === s ? 'scale(1.15)' : 'scale(1)',
                    padding: '4px',
                  }}
                >⭐</button>
              ))}
            </div>

            {/* Optional comment */}
            {stars > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <textarea
                  placeholder="Chceš niečo dodať? (nepovinné)"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: '1.5px solid #ddd', borderRadius: '10px',
                    padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit',
                    resize: 'none', color: '#333',
                  }}
                />
              </div>
            )}

            <button
              onClick={submitReview}
              disabled={stars === 0 || submitting}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                border: 'none', background: stars === 0 ? '#ddd' : '#1D491F',
                color: stars === 0 ? '#999' : 'white',
                fontSize: '16px', fontWeight: '700',
                cursor: stars === 0 ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {submitting ? 'Odosielam...' : 'Odoslať hodnotenie'}
            </button>

            <button
              onClick={dismiss}
              style={{
                width: '100%', marginTop: '10px', padding: '10px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '13px', color: '#999',
              }}
            >
              Teraz nie
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
