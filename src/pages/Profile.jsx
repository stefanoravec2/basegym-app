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
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>{profile?.full_name || 'Môj profil'}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</p>
          {profile?.nickname && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>@{profile.nickname}</p>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEditMode(!editMode)} className="btn" style={{ fontSize: '13px' }}>{editMode ? 'Zrušiť' : 'Upraviť'}</button>
          <button className="btn" onClick={signOut} style={{ fontSize: '13px' }}>Odhlásiť</button>
        </div>
      </div>

      {editMode && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Upraviť profil</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Prezývka</label><input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="jano88" /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Telefón</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+421 900 000 000" /></div>
            <button onClick={saveProfile} disabled={saving} style={{ background: '#2D6A4F', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>{saving ? 'Ukladám...' : 'Uložiť'}</button>
          </div>
        </div>
      )}

      {msg && <div style={{ background: '#D8F3DC', color: '#1B4332', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>{msg}</div>}

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Načítavam...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zostatok</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono', color: activeCredit ? '#1B4332' : 'var(--red)' }}>{activeCredit?.amount || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>kreditov</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Platné do</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: daysUntilExpiry <= 7 ? 'var(--red)' : 'var(--text)' }}>{activeCredit ? new Date(activeCredit.expires_at).toLocaleDateString('sk-SK') : '—'}</div>
              {daysUntilExpiry <= 7 && activeCredit && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>⚠️ o {daysUntilExpiry} dní</div>}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tréningov</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono' }}>{totalTrainings}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>celkom</div>
            </div>
          </div>
          {!activeCredit && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', marginBottom: '20px' }}>Nemáš aktívne kredity. Kontaktuj trénera pre obnovenie členstva.</div>}
          <div className="card" style={{ padding: '0 20px', marginBottom: '16px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>História tréningov</div>
            {reservations.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne rezervácie</p>
            : reservations.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{r.trainings?.title || 'Tréning'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.trainings?.starts_at ? new Date(r.trainings.starts_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </div>
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500', background: r.status === 'attended' ? '#D8F3DC' : r.status === 'active' ? '#DBEAFE' : '#F5F5F3', color: r.status === 'attended' ? '#1B4332' : r.status === 'active' ? '#1E3A8A' : '#888' }}>
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
                <span style={{ fontWeight: '700', fontFamily: 'DM Mono', fontSize: '15px', color: l.change_amount > 0 ? '#1B4332' : 'var(--red)' }}>{l.change_amount > 0 ? '+' : ''}{l.change_amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
      }
