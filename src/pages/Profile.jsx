import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { getAttendedDates, computeStreak, computeBadges, computeMonthlyStats, weekBuckets, heatLevel } from '../lib/progress'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [credits, setCredits] = useState([])
  const [logs, setLogs] = useState([])
  const [reservations, setReservations] = useState([])
  const [statsReservations, setStatsReservations] = useState([])
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
    setLoading(false)
  }

  const activeCredit = credits.find(c => c.is_active && new Date(c.starts_at) <= new Date() && new Date(c.expires_at) >= new Date())
  const totalTrainings = reservations.filter(r => r.status === 'attended' || r.status === 'active').length
  const daysUntilExpiry = activeCredit ? Math.ceil((new Date(activeCredit.expires_at) - new Date()) / 86400000) : null
  const expiryUrgent = activeCredit && daysUntilExpiry <= 5

  const attendedDates = getAttendedDates(statsReservations)
  const streak = computeStreak(attendedDates)
  const badges = computeBadges(attendedDates, profile?.created_at)
  const monthly = computeMonthlyStats(attendedDates)
  const buckets = weekBuckets(attendedDates, 28)

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
            <div className={`scoreboard-panel ${!activeCredit ? 'urgent' : ''}`}>
              <div className="label">Zostatok</div>
              <div className={`num ${!activeCredit ? 'urgent' : ''}`} style={{ fontSize: '24px' }}>{activeCredit?.amount || 0}</div>
              <div style={{ fontSize: '11px', color: '#9C9A92' }}>kreditov</div>
            </div>
            <div className={`scoreboard-panel ${expiryUrgent ? 'urgent' : ''}`}>
              <div className="label">Platné do</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: expiryUrgent ? 'var(--score-text-urgent)' : 'var(--score-text)', fontFamily: 'DM Mono, monospace' }}>{activeCredit ? new Date(activeCredit.expires_at).toLocaleDateString('sk-SK') : '—'}</div>
              {expiryUrgent && <div style={{ fontSize: '10.5px', color: 'var(--score-text-urgent)', marginTop: '2px' }}>posledných {daysUntilExpiry} dní</div>}
            </div>
            <div className="scoreboard-panel">
              <div className="label">Tréningov</div>
              <div className="num" style={{ fontSize: '24px' }}>{totalTrainings}</div>
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
                <div style={{ fontSize: '12px', opacity: 0.92, marginTop: '2px' }}>{streak.current > 0 ? 'v sérii — každý týždeň si splnil svoj cieľ' : 'zatiaľ bez aktívnej série — 3 tréningy/týždeň ju naštartujú'}</div>
              </div>
            </div>
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.25)', fontSize: '11.5px', opacity: 0.9, display: 'flex', justifyContent: 'space-between' }}>
              <span>Osobný rekord</span>
              <b style={{ fontFamily: 'DM Mono, monospace', fontWeight: '700' }}>{streak.record} {streak.record === 1 ? 'týždeň' : 'týždňov'} 🏆</b>
            </div>
          </div>

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
        </>
      )}
    </div>
  )
}
