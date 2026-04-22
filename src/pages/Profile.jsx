import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, profile, signOut } = useAuth()
  const [credits, setCredits] = useState([])
  const [logs, setLogs] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: cr } = await supabase.from('credits').select('*').eq('client_firebase_uid', user.uid).order('created_at', { ascending: false })
    setCredits(cr || [])

    const { data: lg } = await supabase.from('credit_logs').select('*').eq('client_firebase_uid', user.uid).order('created_at', { ascending: false }).limit(30)
    setLogs(lg || [])

    const { data: res } = await supabase
      .from('reservations')
      .select('*, trainings(title, starts_at)')
      .eq('client_firebase_uid', user.uid)
      .order('created_at', { ascending: false })
      .limit(20)
    setReservations(res || [])
    setLoading(false)
  }

  const activeCredit = credits.find(c => c.is_active && new Date(c.expires_at) >= new Date())
  const totalUsed = logs.filter(l => l.change_amount < 0).reduce((s, l) => s + Math.abs(l.change_amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '600' }}>{profile?.full_name || 'Môj profil'}</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user?.email}</p>
        </div>
        <button className="btn" onClick={signOut} style={{ fontSize: '13px' }}>Odhlásiť</button>
      </div>

      {loading ? <p style={{ color: 'var(--text-muted)' }}>Načítavam...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zostatok</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono', color: activeCredit ? 'var(--green)' : 'var(--red)' }}>{activeCredit?.amount || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>kreditov</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Platné do</div>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>{activeCredit ? new Date(activeCredit.expires_at).toLocaleDateString('sk-SK') : '—'}</div>
              {activeCredit && new Date(activeCredit.expires_at) < new Date(Date.now() + 7 * 86400000) && (
                <span className="badge badge-amber" style={{ marginTop: '4px', fontSize: '11px' }}>Expiruje čoskoro</span>
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Celkom tréningov</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'DM Mono' }}>{totalUsed}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>použitých kreditov</div>
            </div>
          </div>

          {!activeCredit && (
            <div className="info-box info-red" style={{ marginBottom: '20px' }}>
              Nemáš aktívne kredity. Kontaktuj trénera pre obnovenie členstva.
            </div>
          )}

          <div className="card" style={{ padding: '0 20px', marginBottom: '16px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>História kreditov</div>
            {credits.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne záznamy</p> :
              credits.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      Nabité {c.amount} kreditov
                      {c.note && <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}> · {c.note}</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(c.created_at).toLocaleDateString('sk-SK')} · platné do {new Date(c.expires_at).toLocaleDateString('sk-SK')}
                    </div>
                  </div>
                  <span className={`badge ${c.is_active && new Date(c.expires_at) >= new Date() ? 'badge-green' : 'badge-red'}`}>
                    {c.is_active && new Date(c.expires_at) >= new Date() ? 'Aktívne' : 'Expirované'}
                  </span>
                </div>
              ))
            }
          </div>

          <div className="card" style={{ padding: '0 20px' }}>
            <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: '600' }}>Pohyby kreditov</div>
            {logs.length === 0 ? <p style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Žiadne záznamy</p> :
              logs.map(l => (
                <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px' }}>{l.reason}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(l.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <span style={{ fontWeight: '700', fontFamily: 'DM Mono', fontSize: '15px', color: l.change_amount > 0 ? 'var(--green)' : 'var(--red)' }}>
                    {l.change_amount > 0 ? '+' : ''}{l.change_amount}
                  </span>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}
