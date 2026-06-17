import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAYS_SK = ['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota']

export default function Calendar() {
  const { user, profile } = useAuth()
  const [trainings, setTrainings] = useState([])
  const [reservations, setReservations] = useState([])
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'green' })
  const [expanded, setExpanded] = useState(null)
  const [visibleDays, setVisibleDays] = useState(2)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    setVisibleDays(2)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)
    maxDate.setHours(23, 59, 59, 0)
    const { data: tr } = await supabase
      .from('trainings')
      .select('*, reservations(id, client_firebase_uid, status, client_profiles(nickname, full_name))')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', maxDate.toISOString())
      .eq('is_cancelled', false)
      .order('starts_at')
    setTrainings(tr || [])
    const { data: res } = await supabase
      .from('reservations')
      .select('*')
      .eq('client_firebase_uid', user.uid)
      .eq('status', 'active')
    setReservations(res || [])
    const { data: cr } = await supabase
      .from('credits')
      .select('*')
      .eq('client_firebase_uid', user.uid)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString().split('T')[0])
      .order('expires_at')
      .limit(1)
      .maybeSingle()
    setCredits(cr || null)
    setLoading(false)
  }

  function isReserved(tid) { return reservations.some(r => r.training_id === tid) }
  function canCancel(t) { return (new Date(t.starts_at) - new Date()) / 60000 > 30 }
  function showMsg(text, type = 'green') {
    setActionMsg({ text, type })
    setTimeout(() => setActionMsg({ text: '', type: 'green' }), 3500)
  }
  function formatTime(dt) { return new Date(dt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' }) }

  async function reserve(training) {
    if (!credits || credits.amount <= 0) { showMsg('Nemáš dosť kreditov. Kontaktuj trénera.', 'red'); return }
    const cost = training.credits_cost || 1
    if (credits.amount < cost) { showMsg(`Na tento tréning potrebuješ ${cost} kredit(y). Máš len ${credits.amount}.`, 'red'); return }
    const trainingDate = new Date(training.starts_at).toISOString().split('T')[0]
    if (trainingDate > credits.expires_at) { showMsg('Tvoje kredity expirujú skôr ako je tento tréning.', 'red'); return }
    const { error } = await supabase.from('reservations').insert({
      training_id: training.id, client_firebase_uid: user.uid,
      client_id: profile?.id, credits_deducted: cost, status: 'active'
    })
    if (!error) {
      await supabase.from('credits').update({ amount: credits.amount - cost }).eq('id', credits.id)
      await supabase.from('credit_logs').insert({
        client_firebase_uid: user.uid, client_id: profile?.id, change_amount: -cost,
        reason: `Rezervácia: ${training.title} (${new Date(training.starts_at).toLocaleDateString('sk-SK')})`,
        training_id: training.id
      })
      showMsg('Rezervácia úspešná! 🎉'); loadData()
    } else {
      if (error.code === '23505') showMsg('Na tento tréning si už prihlásený/á.', 'red')
      else showMsg('Chyba. Skús znova.', 'red')
    }
  }

  async function cancel(training) {
    if (!canCancel(training)) { showMsg('Odhlásenie nie je možné menej ako 30 minút pred tréningom.', 'red'); return }
    const res = reservations.find(r => r.training_id === training.id)
    if (!res) return
    await supabase.from('reservations').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', res.id)
    if (credits) {
      const refund = res.credits_deducted || 1
      await supabase.from('credits').update({ amount: credits.amount + refund }).eq('id', credits.id)
      await supabase.from('credit_logs').insert({ client_firebase_uid: user.uid, client_id: profile?.id, change_amount: refund, reason: `Zrušenie: ${training.title}` })
    }
    showMsg('Rezervácia zrušená. Kredity vrátené.'); loadData()
  }

  const byDay = trainings.reduce((acc, t) => {
    const key = new Date(t.starts_at).toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const daysUntilExpiry = credits ? Math.ceil((new Date(credits.expires_at) - new Date()) / 86400000) : null
  const expiryUrgent = credits && daysUntilExpiry <= 5

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className={`scoreboard-panel ${expiryUrgent ? 'urgent' : ''}`} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="label">Zostáva</div>
          <div className={`num ${expiryUrgent ? 'urgent' : ''}`}>{credits ? credits.amount : 0}<span style={{ fontSize: '13px', fontWeight: '400', color: '#9C9A92', marginLeft: '6px' }}>kreditov</span></div>
        </div>
        {credits ? (
          <div style={{ textAlign: 'right' }}>
            <div className={`exp ${expiryUrgent ? 'urgent' : ''}`}>platné do {new Date(credits.expires_at).toLocaleDateString('sk-SK')}</div>
            {expiryUrgent && <div style={{ fontSize: '11px', color: 'var(--score-text-urgent)', marginTop: '2px' }}>posledných {daysUntilExpiry} {daysUntilExpiry === 1 ? 'deň' : 'dní'}</div>}
          </div>
        ) : <span className="badge badge-red">Žiadne aktívne kredity</span>}
      </div>
      {actionMsg.text && (
        <div className={`info-box ${actionMsg.type === 'red' ? 'info-red' : 'info-green'}`} style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, fontWeight: '500', maxWidth: '90%', boxShadow: '0 6px 20px rgba(0,0,0,0.18)'
        }}>{actionMsg.text}</div>
      )}
      {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Načítavam tréningy...</p>
      : Object.keys(byDay).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '15px', fontWeight: '500' }}>Žiadne tréningy v najbližších 14 dňoch</p>
        </div>
      ) : (
        <div>
          {Object.entries(byDay).slice(0, visibleDays).map(([dateStr, dayTrainings]) => {
            const day = new Date(dateStr)
            const isToday = day.toDateString() === new Date().toDateString()
            const isTomorrow = day.toDateString() === new Date(Date.now() + 86400000).toDateString()
            return (
              <div key={dateStr} style={{ marginBottom: '28px' }}>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div className="display" style={{ fontSize: '30px', color: 'var(--text)', lineHeight: 1.1 }}>{day.getDate()}. {day.getMonth() + 1}. {day.getFullYear()}</div>
                  <div style={{ fontSize: '14px', color: isToday ? 'var(--green)' : 'var(--text-muted)', marginTop: '2px', fontWeight: isToday ? '600' : '400' }}>{isToday ? 'Dnes' : isTomorrow ? 'Zajtra' : DAYS_SK[day.getDay()]}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dayTrainings.map(t => {
                    const reserved = isReserved(t.id)
                    const activeRes = (t.reservations || []).filter(r => r.status === 'active')
                    const activeCount = activeRes.length
                    const full = activeCount >= t.capacity
                    const past = new Date(t.starts_at) < new Date()
                    const isExp = expanded === t.id
                    return (
                      <div key={t.id} style={{ borderRadius: '14px', background: reserved ? 'var(--green-bg)' : 'white', border: `1.5px solid ${reserved ? 'var(--green)' : 'var(--border-md)'}`, overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                              <div style={{ minWidth: '90px' }}>
                                <span style={{ fontSize: '22px', fontWeight: '700' }}>{formatTime(t.starts_at)}</span>
                                {t.ends_at && <span style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: '4px' }}>- {formatTime(t.ends_at)}</span>}
                              </div>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{t.title}</div>
                                {t.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t.description}</div>}
                                {reserved && <span className="badge" style={{ background: 'var(--green)', color: 'white', marginTop: '4px' }}>✓ Prihlásený/á</span>}
                              </div>
                            </div>
                            <span className={`scoreboard ${full ? 'urgent' : ''}`}>{activeCount}/{t.capacity}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="badge badge-amber">{t.credits_cost || 1} kredit</span>
                              <button onClick={() => setExpanded(isExp ? null : t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'underline' }}>
                                prihlásení {isExp ? '▲' : '▼'}
                              </button>
                            </div>
                            {reserved ? (
                              <button onClick={() => cancel(t)} className="btn btn-red" style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '600' }}>Odhlásiť</button>
                            ) : !past && (
                              full ? (
                                <button disabled style={{ background: '#F2F2EF', border: '1px solid var(--border-md)', color: 'var(--text-hint)', padding: '8px 18px', borderRadius: '10px', fontSize: '13px', cursor: 'default' }}>Plné</button>
                              ) : (
                                <button onClick={() => reserve(t)} className="btn btn-green" style={{ padding: '8px 18px', fontSize: '13px', fontWeight: '600' }}>Prihlásiť sa</button>
                              )
                            )}
                          </div>
                          {isExp && (
                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {activeCount === 0 ? <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nikto nie je prihlásený</span>
                              : activeRes.map((r, i) => {
                                const nick = r.client_profiles?.nickname || r.client_profiles?.full_name?.split(' ')[0] || `Člen ${i+1}`
                                const isMe = r.client_firebase_uid === user.uid
                                return <span key={r.id} style={{ fontSize: '12px', background: isMe ? 'var(--green)' : 'rgba(0,0,0,0.06)', color: isMe ? 'white' : 'var(--text)', borderRadius: '20px', padding: '3px 10px' }}>@{nick}</span>
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {Object.keys(byDay).length > visibleDays && (
            <button onClick={() => setVisibleDays(v => v + 2)} style={{
              display: 'block', width: '100%', margin: '20px auto 0', padding: '16px',
              fontSize: '15px', fontWeight: '600', borderRadius: '12px',
              border: '2px solid var(--green)', background: 'white', color: 'var(--green-dark)', cursor: 'pointer'
            }}>
              Načítať ďalšie dni
            </button>
          )}
        </div>
      )}
    </div>
  )
}
