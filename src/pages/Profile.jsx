import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getAttendedDates, computeStreak, computeBadges, computeMonthlyStats, weekBuckets, heatLevel, currentWeekProgress, DEFAULT_GOAL } from '../lib/progress'

const GOAL_PRESETS = [
  { goal: 2, icon: '🟢', title: 'Voľné tempo', sub: '1–2×/týždeň', desc: 'Udržiavanie formy, pravidelný pohyb bez tlaku.' },
  { goal: 3, icon: '🔵', title: 'Vyvážený pokrok', sub: '3×/týždeň', desc: 'Hranica, od ktorej väčšina ľudí vidí reálny výkonnostný posun.', recommended: true },
  { goal: 4, icon: '🟠', title: 'Zrýchlený pokrok', sub: '4–5×/týždeň', desc: 'Pre tých, čo chcú výsledky rýchlejšie. Nezabudni na regeneráciu.' },
]

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [credits, setCredits] = useState([])
  const [logs, setLogs] = useState([])
  const [reservations, setReservations] = useState([])
  const [statsReservations, setStatsReservations] = useState([])
  const [goalHistory, setGoalHistory] = useState([])
  const [showGoalPicker, setShowGoalPicker] = useState(false)
  const [customGoal, setCustomGoal] = useState(3)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [visibleTrainings, setVisibleTrainings] = useState(5)
  const [visibleLogs, setVisibleLogs] = useState(5)
  const [showMonthHistory, setShowMonthHistory] = useState(false)
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadData()
    if (profile) { setNickname(profile.nickname || ''); setPhone(profile.phone || '') }
  }, [profile])

  async function loadData() {
    const { data: cr } = await supabase.from('credits').select('*').eq('client_firebase_uid', user.uid).order('created_at', { ascending: false })
    setCredits(cr || [])
    const { data: lg } = await supabase.from('credit_logs').select('*').eq('client_firebase_uid', user.uid).order('created_at', { ascending: false }).limit(50)
    setLogs(lg || [])
    const { data: res } = await supabase.from('reservations').select('*, trainings(title, starts_at)').eq('client_firebase_uid', user.uid).order('created_at', { ascending: false }).limit(30)
    setReservations(res || [])
    const { data: allRes } = await supabase.from('reservations').select('status, trainings(starts_at)').eq('client_firebase_uid', user.uid).eq('status', 'active').limit(2000)
    setStatsReservations(allRes || [])
    const { data: gh } = await supabase.from('client_goal_history').select('*').eq('client_firebase_uid', user.uid).order('effective_from', { ascending: true })
    setGoalHistory(gh || [])
    setLoading(false)
  }

  async function setGoal(goal) {
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    // Najprv skús update, ak neexistuje, insert
    const { data: existing } = await supabase.from('client_goal_history')
      .select('id').eq('client_firebase_uid', user.uid).eq('effective_from', today).limit(1).maybeSingle()
    if (existing) {
      await supabase.from('client_goal_history').update({ goal }).eq('id', existing.id)
    } else {
      await supabase.from('client_goal_history').insert({ client_firebase_uid: user.uid, goal, effective_from: today })
    }
    // Znova načítaj všetko
    const { data: gh } = await supabase.from('client_goal_history').select('*').eq('client_firebase_uid', user.uid).order('effective_from', { ascending: true })
    setGoalHistory(gh || [])
    setShowGoalPicker(false)
    setSaving(false)
  }

  const activeCredit = credits.find(c => c.is_active && new Date(c.starts_at) <= new Date() && new Date(c.expires_at) >= new Date())
  const totalTrainings = reservations.filter(r => r.status === 'attended' || r.status === 'active').length
  const daysUntilExpiry = activeCredit ? Math.ceil((new Date(activeCredit.expires_at) - new Date()) / 86400000) : null
  const expiryUrgent = activeCredit && daysUntilExpiry <= 5

  const attendedDates = getAttendedDates(statsReservations)
  const streak = computeStreak(attendedDates, goalHistory)
  const badges = computeBadges(attendedDates, profile?.created_at)
  const monthly = computeMonthlyStats(attendedDates)
  const buckets = weekBuckets(attendedDates, 28)
  const weekProgress = currentWeekProgress(attendedDates, goalHistory)
  const currentGoal = weekProgress.goal

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('client_profiles').update({ nickname: nickname.trim(), phone: phone.trim() }).eq('firebase_uid', user.uid)
    if (!error) { setMsg('Uložené!'); setEditMode(false); setTimeout(() => setMsg(''), 3000) }
    setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 className="display" style={{ fontSize: '24px', color: 'var(--text)' }}>{profile?.full_name || 'Môj profil'}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</p>
          {profile?.nickname && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>@{profile.nickname}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEditMode(!editMode)} className="btn" style={{ fontSize: '13px' }}>{editMode ? 'Zrušiť' : 'Upraviť'}</button>
          <button className="btn" onClick={signOut} style={{ fontSize: '13px' }}>Odhlásiť</button>
        </div>
      </div>

      {editMode && (
        <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Upraviť profil</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div><label className="form-label">Prezývka</label><input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="jano88" /></div>
            <div><label className="form-label">Telefón</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+421 900 000 000" /></div>
            <button onClick={saveProfile} disabled={saving} className="btn btn-green" style={{ padding: '10px', fontWeight: '600', fontSize: '13px' }}>{saving ? 'Ukladám...' : 'Uložiť'}</button>
          </div>
        </div>
      )}

      {msg && <div className="info-box info-green" style={{ marginBottom: '16px' }}>{msg}</div>}

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Načítavam...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: !activeCredit ? '#FEE2E2' : '#15171A', borderRadius: '12px', padding: '14px', border: !activeCredit ? '2px solid #EF4444' : 'none' }}>
              <div style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: !activeCredit ? '#991B1B' : '#9C9A92' }}>Zostatok</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono, monospace', color: !activeCredit ? '#991B1B' : 'var(--score-text)' }}>{activeCredit?.amount || 0}</div>
              <div style={{ fontSize: '11px', color: !activeCredit ? '#B91C1C' : '#9C9A92' }}>kreditov</div>
            </div>
            <div style={{ background: expiryUrgent ? '#FEE2E2' : '#15171A', borderRadius: '12px', padding: '14px', border: expiryUrgent ? '2px solid #EF4444' : 'none' }}>
              <div style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: expiryUrgent ? '#991B1B' : '#9C9A92' }}>Platné do</div>
              <div style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'DM Mono, monospace', color: expiryUrgent ? '#991B1B' : 'var(--score-text)' }}>{activeCredit ? new Date(activeCredit.expires_at).toLocaleDateString('sk-SK') : '—'}</div>
              {expiryUrgent && <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', marginTop: '2px' }}>⚠ {daysUntilExpiry} {daysUntilExpiry === 1 ? 'deň' : 'dní'}!</div>}
            </div>
            <div style={{ background: '#15171A', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9C9A92' }}>Tréningov</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono, monospace', color: 'var(--score-text)' }}>{totalTrainings}</div>
              <div style={{ fontSize: '11px', color: '#9C9A92' }}>celkom</div>
            </div>
          </div>
          {!activeCredit && <div className="info-box info-red" style={{ marginBottom: '20px' }}>Nemáš aktívne kredity. Kontaktuj trénera pre obnovenie členstva.</div>}

          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-hint)', margin: '0 2px 9px' }}>Tvoj pokrok</div>

          <div className="streak-hero" style={{ marginBottom: '14px' }}>
            <div className="row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="flame" style={{ fontSize: '38px', lineHeight: 1 }}>🔥</div>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '26px', fontWeight: '700', lineHeight: 1 }}>{streak.current} {streak.current === 1 ? 'týždeň' : streak.current >= 2 && streak.current <= 4 ? 'týždne' : 'týždňov'}</div>
                <div style={{ fontSize: '12px', opacity: 0.92, marginTop: '2px' }}>{streak.current > 0 ? 'v sérii — každý týždeň si splnil svoj cieľ' : 'zatiaľ bez aktívnej série'}</div>
              </div>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', opacity: 0.9, marginBottom: '6px' }}>
                <span>Tento týždeň</span>
                <b style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700' }}>{weekProgress.count}/{weekProgress.goal}</b>
              </div>
              <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (weekProgress.count / weekProgress.goal) * 100)}%`, background: 'white', borderRadius: '4px' }} />
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.25)', fontSize: '11.5px', opacity: 0.9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Osobný rekord: <b style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700' }}>{streak.record} {streak.record === 1 ? 'týždeň' : 'týždňov'}</b> 🏆</span>
              <button onClick={() => setShowGoalPicker(v => !v)} style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '9px 14px', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', position: 'relative', zIndex: 2, minHeight: '36px' }}>
                Zmeniť cieľ: {currentGoal}× ✎
              </button>
            </div>
          </div>

          {showGoalPicker && (
            <div className="card" style={{ padding: '16px', marginBottom: '14px', background: 'var(--green-dark)', color: 'white', border: 'none' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px', opacity: 0.8 }}>Nastav si cieľ</div>
              {GOAL_PRESETS.map(p => (
                <button key={p.goal} onClick={() => setGoal(p.goal)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', marginBottom: '8px', cursor: 'pointer', width: '100%', textAlign: 'left',
                  background: currentGoal === p.goal ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)',
                  border: currentGoal === p.goal ? '2px solid white' : '2px solid transparent', color: 'white',
                  fontFamily: 'Poppins, sans-serif', fontSize: '13px'
                }}>
                  <span style={{ fontSize: '22px' }}>{p.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700' }}>{p.title} {p.recommended && <span style={{ fontSize: '10px', opacity: 0.85 }}>⭐ odporúčané</span>}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{p.sub} — {p.desc}</div>
                  </div>
                </button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', marginTop: '4px' }}>
                <span style={{ fontSize: '22px' }}>⚙️</span>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: '700' }}>Vlastné číslo</div>
                <select value={customGoal} onChange={e => setCustomGoal(parseInt(e.target.value))} style={{ borderRadius: '8px', border: 'none', padding: '8px 10px', fontSize: '13px' }}>
                  {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}×</option>)}
                </select>
                <button disabled={saving} onClick={() => setGoal(customGoal)} style={{ background: 'white', color: 'var(--green-dark)', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  Nastaviť
                </button>
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '16px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {badges.map(b => (
                <div key={b.id} style={{ flexShrink: 0, width: '78px', textAlign: 'center', opacity: b.earned ? 1 : 0.55 }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', margin: '0 auto 6px',
                    background: b.earned ? 'linear-gradient(155deg, #FFD866, #F4A81E)' : '#E5E3DD',
                    boxShadow: b.earned ? '0 5px 12px rgba(244,168,30,0.35)' : 'none',
                    filter: b.earned ? 'none' : 'grayscale(1)'
                  }}>{b.icon}</div>
                  <div style={{ fontSize: '9.5px', fontWeight: '600', color: b.earned ? 'var(--text)' : 'var(--text-hint)', lineHeight: 1.25 }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="month-card" style={{ marginBottom: '14px', cursor: 'pointer' }} onClick={() => setShowMonthHistory(v => !v)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '17px', marginBottom: '4px' }}>{monthly[0]?.label || 'Tento mesiac'}</h3>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '28px', fontWeight: '700' }}>{monthly[0]?.count || 0}</div>
                <div style={{ fontSize: '11px', opacity: 0.85 }}>tréningov zvládnutých</div>
                {monthly.length > 1 && (
                  <div style={{ background: 'rgba(255,255,255,0.16)', borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', display: 'inline-block', marginTop: '8px' }}>
                    {monthly[0].count >= monthly[1].count ? '↑' : '↓'} {Math.abs(monthly[0].count - monthly[1].count)} {monthly[0].count >= monthly[1].count ? 'viac' : 'menej'} ako {monthly[1].label}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '11px', opacity: 0.8 }}>{showMonthHistory ? '▲ skryť históriu' : '▼ história mesiacov'}</span>
            </div>
            {showMonthHistory && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.25)' }}>
                {monthly.length === 0 ? (
                  <p style={{ fontSize: '12px', opacity: 0.85 }}>Zatiaľ žiadna história.</p>
                ) : monthly.map(m => (
                  <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '12.5px' }}>
                    <span style={{ opacity: 0.9 }}>{m.label}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700' }}>{m.count} {m.count === 1 ? 'tréning' : 'tréningov'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: '14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-hint)', marginBottom: '10px' }}>
              Mapa dochádzky — posledných {buckets.length} týždňov
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '4px' }}>
              {buckets.map(b => {
                const lvl = heatLevel(b.count)
                const colors = ['#E7E5DF', '#C6E8C8', '#8FD196', '#4CAE52', 'var(--green-dark)']
                return <div key={b.key} title={`${b.count} tréningov`} style={{ aspectRatio: '1', borderRadius: '3px', background: colors[lvl] }} />
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', fontSize: '10px', color: 'var(--text-hint)', justifyContent: 'flex-end' }}>
              menej {[0,1,2,3,4].map(l => <div key={l} style={{ width: '10px', height: '10px', borderRadius: '2px', background: ['#E7E5DF', '#C6E8C8', '#8FD196', '#4CAE52', 'var(--green-dark)'][l] }} />)} viac
            </div>
          </div>

          <div className="card" style={{ padding: '0 20px', marginBottom: '16px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>História tréningov</div>
            {reservations.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne rezervácie</p>
            : reservations.slice(0, visibleTrainings).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{r.trainings?.title || 'Tréning'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.trainings?.starts_at ? new Date(r.trainings.starts_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </div>
                <span className={`badge ${r.status === 'attended' ? 'badge-green' : r.status === 'active' ? 'badge-blue' : ''}`} style={r.status === 'cancelled' ? { background: '#F2F2EF', color: '#888' } : undefined}>
                  {r.status === 'attended' ? '✓ Absolvovaný' : r.status === 'active' ? 'Prihlásený' : 'Zrušený'}
                </span>
              </div>
            ))}
            {reservations.length > visibleTrainings && (
              <button onClick={() => setVisibleTrainings(v => v + 5)} className="btn" style={{ width: '100%', margin: '12px 0', fontSize: '12.5px' }}>
                Zobraziť ďalšie ({reservations.length - visibleTrainings})
              </button>
            )}
          </div>
          <div className="card" style={{ padding: '0 20px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>Pohyby kreditov</div>
            {logs.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne záznamy</p>
            : logs.slice(0, visibleLogs).map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px' }}>{l.reason}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <span style={{ fontWeight: '700', fontFamily: 'DM Mono, monospace', fontSize: '15px', color: l.change_amount > 0 ? 'var(--green-dark)' : 'var(--red)' }}>{l.change_amount > 0 ? '+' : ''}{l.change_amount}</span>
              </div>
            ))}
            {logs.length > visibleLogs && (
              <button onClick={() => setVisibleLogs(v => v + 5)} className="btn" style={{ width: '100%', margin: '12px 0', fontSize: '12.5px' }}>
                Zobraziť ďalšie ({logs.length - visibleLogs})
              </button>
            )}
          </div>

          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-hint)', margin: '20px 2px 9px' }}>Informácie</div>
          <div className="card" style={{ padding: '18px 20px', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Cenník permanentiek</h4>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              Gold (neobmedzené) — 59 €/mesiac<br/>
              Silver (12 kreditov) — 45 €/mesiac<br/>
              Basic kurz (8 kreditov) — 35 €/mesiac<br/>
              Jednorázový vstup — 6 €
            </div>
          </div>
          <div className="card" style={{ padding: '18px 20px', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Pravidlá prihlasovania</h4>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              • Na tréning sa prihlás vopred cez appku<br/>
              • 1 tréning = 1 kredit<br/>
              • Odhlásiť sa je možné najneskôr 30 min pred začiatkom — inak kredit prepadáva<br/>
              • Kapacita je obmedzená — ak je plno, sleduj voľné miesta
            </div>
          </div>        </>
      )}
    </div>
  )
}
