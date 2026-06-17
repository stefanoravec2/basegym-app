import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [credits, setCredits] = useState([])
  const [logs, setLogs] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
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
    setLoading(false)
  }

  const activeCredit = credits.find(c => c.is_active && new Date(c.expires_at) >= new Date())
  const totalTrainings = reservations.filter(r => r.status === 'attended' || r.status === 'active').length
  const daysUntilExpiry = activeCredit ? Math.ceil((new Date(activeCredit.expires_at) - new Date()) / 86400000) : null
  const expiryUrgent = activeCredit && daysUntilExpiry <= 5

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
          <div className="card" style={{ padding: '0 20px', marginBottom: '16px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>História tréningov</div>
            {reservations.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne rezervácie</p>
            : reservations.map(r => (
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
          </div>
          <div className="card" style={{ padding: '0 20px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>Pohyby kreditov</div>
            {logs.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne záznamy</p>
            : logs.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px' }}>{l.reason}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <span style={{ fontWeight: '700', fontFamily: 'DM Mono, monospace', fontSize: '15px', color: l.change_amount > 0 ? 'var(--green-dark)' : 'var(--red)' }}>{l.change_amount > 0 ? '+' : ''}{l.change_amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
