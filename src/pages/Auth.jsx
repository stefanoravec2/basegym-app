import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function update(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) setError('Nesprávny email alebo heslo.')
    } else {
      if (!form.fullName) { setError('Zadaj svoje meno.'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.fullName)
      if (error) setError('Registrácia zlyhala. Skús iný email.')
      else setSuccess('Účet vytvorený! Môžeš sa prihlásiť.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', background: '#1A1A1A', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'white', fontSize: '18px', fontWeight: '700', fontFamily: 'DM Mono' }}>BG</div>
          <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '4px' }}>BaseGym BB</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Klientský portál · Rezervácie tréningov</p>
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--border)', padding: '4px', borderRadius: 'var(--radius-full)' }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
              flex: 1, padding: '8px', borderRadius: 'var(--radius-full)', border: 'none',
              background: mode === m ? 'white' : 'none',
              color: mode === m ? 'var(--text)' : 'var(--text-muted)',
              fontWeight: mode === m ? '600' : '400', cursor: 'pointer', fontSize: '13px'
            }}>{m === 'login' ? 'Prihlásenie' : 'Registrácia'}</button>
          ))}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Meno a priezvisko *</label>
                <input className="form-input" placeholder="Ján Novák" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="jan@email.sk" value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Heslo *</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} required />
            </div>
            {error && <div className="info-box info-red" style={{ marginBottom: '12px' }}>{error}</div>}
            {success && <div className="info-box info-green" style={{ marginBottom: '12px' }}>{success}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '11px' }} disabled={loading}>
              {loading ? 'Načítavam...' : mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--text-hint)', fontSize: '12px', marginTop: '20px' }}>
          BaseGym Banská Bystrica
        </p>
      </div>
    </div>
  )
}
