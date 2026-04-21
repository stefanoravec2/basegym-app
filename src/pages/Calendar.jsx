import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAYS_SK = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']
const MONTHS_SK = ['január','február','marec','apríl','máj','jún','júl','august','september','október','november','december']

export default function Calendar() {
  const { user, profile } = useAuth()
  const [trainings, setTrainings] = useState([])
  const [reservations, setReservations] = useState([])
  const [credits, setCredits] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'green' })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { if (profile) loadData() }, [weekOffset, profile])

  async function loadData() {
    setLoading(true)
    const start = getWeekStart(weekOffset)
    const end = new Date(start); end.setDate(end.getDate() + 7)

    const { data: tr } = await supabase
      .from('trainings')
      .select('*, reservations(id, client_firebase_uid, status, client_profiles(full_name))')
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
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

  function getWeekStart(offset = 0) {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now.setDate(diff))
    monday.setHours(0, 0, 0, 0)
    monday.setDate(monday.getDate() + offset * 7)
    return monday
  }

  function getWeekDays() {
    const start = getWeekStart(weekOffset)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i); return d
    })
  }

  function isReserved(trainingId) {
    return reservations.some(r => r.training_id === trainingId)
  }

  function canReserve(training) {
    const start = new Date(training.starts_at)
    const now = new Date()
    const maxAhead = new Date(); maxAhead.setDate(maxAhead.getDate() + 7)
    const activeRes = (training.reservations || []).filter(r => r.status === 'active').length
    return start > now && start <= maxAhead && activeRes < training.capacity
  }

  function canCancel(training) {
    const start = new Date(training.starts_at)
    return (start - new Date()) / 60000 > 30
  }

  function showMsg(text, type = 'green') {
    setActionMsg({ text, type })
    setTimeout(() => setActionMsg({ text: '', type: 'green' }), 3000)
  }

  async function reserve(training) {
    if (!credits || credits.amount <= 0) {
      showMsg('Nemáš dostatok kreditov. Kontaktuj trénera.', 'red')
      return
    }
    const { error } = await supabase.from('reservations').insert({
      training_id: training.id,
      client_firebase_uid: user.uid,
      client_profile_id: profile?.id,
      credits_deducted: training.credits_cost
    })
    if (!error) {
      await supabase.from('credits').update({ amount: credits.amount - training.credits_cost }).eq('id', credits.id)
      await supabase.from('credit_logs').insert({
        client_firebase_uid: user.uid,
        change_amount: -training.credits_cost,
        reason: `Rezervácia: ${training.title} (${new Date(training.starts_at).toLocaleDateString('sk-SK')})`,
        training_id: training.id
      })
      showMsg('Rezervácia úspešná!')
    } else {
      showMsg('Chyba. Skús znova.', 'red')
    }
    loadData()
  }

  async function cancel(training) {
    if (!canCancel(training)) {
      showMsg('Odhlásenie nie je možné menej ako 30 minút pred tréningom.', 'red')
      return
    }
    const res = reservations.find(r => r.training_id === training.id)
    if (!res) return
    await supabase.from('reservations').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', res.id)
    if (credits) {
      await supabase.from('credits').update({ amount: credits.amount + res.credits_deducted }).eq('id', credits.id)
      await supabase.from('credit_logs').insert({
        client_firebase_uid: user.uid,
        change_amount: res.credits_deducted,
        reason: `Zrušenie: ${training.title}`
      })
    }
    showMsg('Rezervácia zrušená. Kredity vrátené.')
    loadData()
  }

  const weekDays = getWeekDays()
  const today = new Date().toDateString()

  return (
    <div>
      {/* Credits bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Zostatok kreditov</div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono', color: credits && credits.amount > 0 ? 'var(--green)' : 'var(--red)' }}>
            {credits ? credits.amount : 0}
            <span style={{ fontSize: '13px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>kreditov</span>
          </div>
        </div>
        {credits ? (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Platné do</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{new Date(credits.expires_at).toLocaleDateString('sk-SK')}</div>
          </div>
        ) : (
          <span className="badge badge-red">Žiadne aktívne kredity</span>
        )}
      </div>

      {actionMsg.text && (
        <div className={`info-box ${actionMsg.type === 'red' ? 'info-red' : 'info-green'}`} style={{ marginBottom: '16px' }}>
          {actionMsg.text}
        </div>
      )}

      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0} style={{ padding: '6px 14px' }}>← Predošlý</button>
        <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: '600' }}>
          {weekDays[0].getDate()}. – {weekDays[6].getDate()}. {MONTHS_SK[weekDays[6].getMonth()]} {weekDays[6].getFullYear()}
        </div>
        <button className="btn" onClick={() => setWeekOffset(w => Math.min(1, w + 1))} disabled={weekOffset === 1} style={{ padding: '6px 14px' }}>Ďalší →</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>Načítavam...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {weekDays.map(day => {
            const dayTrainings = trainings.filter(t => new Date(t.starts_at).toDateString() === day.toDateString())
            const isToday = day.toDateString() === today
            const isPast = day < new Date() && !isToday
            return (
              <div key={day.toDateString()} style={{ opacity: isPast ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isToday ? '#1A1A1A' : 'var(--bg)', border: isToday ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '10px', color: isToday ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', lineHeight: 1 }}>{DAYS_SK[day.getDay()]}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: isToday ? 'white' : 'var(--text)', lineHeight: 1.2 }}>{day.getDate()}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {day.toLocaleDateString('sk-SK', { weekday: 'long' })}
                  </div>
                  {dayTrainings.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>Žiadne tréningy</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '46px' }}>
                  {dayTrainings.map(t => {
                    const start = new Date(t.starts_at)
                    const end = new Date(t.ends_at)
                    const reserved = isReserved(t.id)
                    const activeCount = (t.reservations || []).filter(r => r.status === 'active').length
                    const full = activeCount >= t.capacity
                    const past = start < new Date()
                    const isExpanded = expanded === t.id
                    const attendees = (t.reservations || []).filter(r => r.status === 'active')
                    return (
                      <div key={t.id} style={{ background: 'white', border: `1.5px solid ${reserved ? 'var(--green)' : 'var(--border)'}`, borderRadius: '12px', padding: '12px 16px', opacity: past ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{t.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {start.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{t.credits_cost} kredit{t.credits_cost > 1 ? 'y' : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => setExpanded(isExpanded ? null : t.id)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                              {activeCount}/{t.capacity}
                            </button>
                            {!past && (
                              reserved ? (
                                <button onClick={() => cancel(t)} className="btn btn-red" style={{ fontSize: '12px', padding: '6px 14px' }}>Odhlásiť</button>
                              ) : (
                                <button onClick={() => reserve(t)} className="btn btn-green" style={{ fontSize: '12px', padding: '6px 14px' }} disabled={full || !canReserve(t)}>
                                  {full ? 'Plné' : 'Prihlásiť'}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                        {reserved && <div style={{ marginTop: '6px' }}><span className="badge badge-green">Prihlásený/á</span></div>}
                        {t.description && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>{t.description}</div>}
                        {isExpanded && attendees.length > 0 && (
                          <div style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>Prihlásení ({attendees.length})</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {attendees.map((r, i) => (
                                <span key={i} style={{ fontSize: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '999px', padding: '3px 10px' }}>
                                  {r.client_profiles?.full_name || 'Člen'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
