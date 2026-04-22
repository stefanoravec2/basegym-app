import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const DAYS_SK = ['nedeľa','pondelok','utorok','streda','štvrtok','piatok','sobota']
const MONTHS_SK = ['januára','februára','marca','apríla','mája','júna','júla','augusta','septembra','októbra','novembra','decembra']

export default function Calendar() {
  const { user, profile } = useAuth()
  const [trainings, setTrainings] = useState([])
  const [reservations, setReservations] = useState([])
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState({ text: '', type: 'green' })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 7)
    maxDate.setHours(23, 59, 59, 0)

    const { data: tr } = await supabase
      .from('trainings')
      .select('*, reservations(id, client_firebase_uid, status)')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', maxDate.toISOString())
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

  function isReserved(trainingId) {
    return reservations.some(r => r.training_id === trainingId)
  }

  function canCancel(training) {
    return (new Date(training.starts_at) - new Date()) / 60000 > 30
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

  // Grupuj podľa dňa
  const byDay = trainings.reduce((acc, t) => {
    const key = new Date(t.starts_at).toDateString()
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  function formatTime(dt) {
    return new Date(dt).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>

      {/* Credits bar */}
      <div style={{
        background: 'white', border: '1px solid var(--border)', borderRadius: '14px',
        padding: '14px 20px', marginBottom: '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Zostatok kreditov</div>
          <div style={{ fontSize: '26px', fontWeight: '700', fontFamily: 'DM Mono', color: credits && credits.amount > 0 ? '#1B4332' : 'var(--red)' }}>
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
          <span style={{ background: 'var(--red-bg)', color: 'var(--red)', fontSize: '12px', padding: '4px 12px', borderRadius: '20px', fontWeight: '500' }}>
            Žiadne aktívne kredity
          </span>
        )}
      </div>

      {actionMsg.text && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', fontWeight: '500',
          background: actionMsg.type === 'red' ? 'var(--red-bg)' : 'var(--green-bg)',
          color: actionMsg.type === 'red' ? 'var(--red)' : 'var(--green-dark)'
        }}>
          {actionMsg.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>Načítavam tréningy...</p>
      ) : Object.keys(byDay).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
          <p style={{ fontSize: '15px', fontWeight: '500' }}>Žiadne tréningy v najbližších 7 dňoch</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Tréner ešte nenaplánoval tréningy</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {Object.entries(byDay).map(([dateStr, dayTrainings]) => {
            const day = new Date(dateStr)
            const isToday = day.toDateString() === new Date().toDateString()
            const isTomorrow = day.toDateString() === new Date(Date.now() + 86400000).toDateString()

            return (
              <div key={dateStr} style={{ marginBottom: '28px' }}>
                {/* Dátumový header */}
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.1 }}>
                    {day.getDate()}. {day.getMonth() + 1}. {day.getFullYear()}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                    {isToday ? '🟢 dnes' : isTomorrow ? 'zajtra' : DAYS_SK[day.getDay()]}
                  </div>
                </div>

                {/* Tréningové kartičky */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dayTrainings.map(t => {
                    const reserved = isReserved(t.id)
                    const activeCount = (t.reservations || []).filter(r => r.status === 'active').length
                    const full = activeCount >= t.capacity
                    const past = new Date(t.starts_at) < new Date()
                    const isExp = expanded === t.id
                    const spotsLeft = t.capacity - activeCount

                    return (
                      <div key={t.id} style={{
                        borderRadius: '14px',
                        background: reserved ? '#D8F3DC' : past ? '#F5F5F3' : 'white',
                        border: `1.5px solid ${reserved ? '#2D6A4F' : full ? '#E5E5E5' : '#E5E5E5'}`,
                        overflow: 'hidden',
                        opacity: past ? 0.7 : 1
                      }}>
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>

                            {/* Čas */}
                            <div style={{ minWidth: '90px' }}>
                              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>
                                {formatTime(t.starts_at)}
                              </span>
                              <span style={{ fontSize: '15px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                - {formatTime(t.ends_at)}
                              </span>
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: '140px' }}>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                                {t.title}
                              </div>
                              {t.description && (
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t.description}</div>
                              )}
                              {reserved && (
                                <span style={{ fontSize: '12px', background: '#2D6A4F', color: 'white', padding: '2px 10px', borderRadius: '20px', fontWeight: '500' }}>
                                  Prihlásený/á
                                </span>
                              )}
                            </div>

                            {/* Akcia */}
                            {!past && (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                                {reserved ? (
                                  <button onClick={() => cancel(t)} style={{
                                    background: 'white', border: '1.5px solid #B91C1C', color: '#B91C1C',
                                    padding: '8px 18px', borderRadius: '10px', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: '600'
                                  }}>Odhlásiť</button>
                                ) : full ? (
                                  <button disabled style={{
                                    background: '#F5F5F3', border: '1px solid #E5E5E5', color: '#A0A0A0',
                                    padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'default'
                                  }}>Plné</button>
                                ) : (
                                  <button onClick={() => reserve(t)} style={{
                                    background: '#2D6A4F', border: 'none', color: 'white',
                                    padding: '8px 18px', borderRadius: '10px', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: '600'
                                  }}>Rezervovať</button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Spodná lišta */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {t.credits_cost} kredit{t.credits_cost > 1 ? 'y' : ''}
                              </span>
                              <span style={{ fontSize: '12px', color: full ? '#B91C1C' : 'var(--text-muted)', fontWeight: full ? '600' : '400' }}>
                                {full ? 'Obsadené' : `zostáva ${spotsLeft} miest`}
                              </span>
                            </div>
                            <button onClick={() => setExpanded(isExp ? null : t.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                              {activeCount}/{t.capacity} prihlásených {isExp ? '▲' : '▼'}
                            </button>
                          </div>

                          {/* Zoznam prihlásených */}
                          {isExp && (
                            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {activeCount === 0 ? (
                                <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>Nikto nie je prihlásený</span>
                              ) : Array.from({ length: activeCount }, (_, i) => (
                                <span key={i} style={{ fontSize: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '20px', padding: '3px 10px' }}>
                                  Člen {i + 1}
                                </span>
                              ))}
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
        </div>
      )}
    </div>
  )
}
