import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        if (!fullName.trim()) { setError('Zadaj meno'); setLoading(false); return }
        if (!nickname.trim()) { setError('Zadaj prezývku'); setLoading(false); return }
        await signUp(email, password, fullName, nickname, phone)
      }
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'Účet neexistuje.',
        'auth/wrong-password': 'Nesprávne heslo.',
        'auth/email-already-in-use': 'Email už je použitý.',
        'auth/weak-password': 'Heslo musí mať aspoň 6 znakov.',
        'auth/invalid-email': 'Neplatný email.',
        'auth/invalid-credential': 'Nesprávny email alebo heslo.',
      }
      setError(msgs[err.code] || 'Chyba. Skús znova.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="BaseGym" style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 12px', display: 'block' }} />
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>BaseGym BB</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Rezervačný systém</p>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--border)', padding: '24px' }}>
          <div style={{ display: 'flex', marginBottom: '20px', background: 'var(--bg)', borderRadius: '10px', padding: '3px', gap: '3px' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex: 1, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: mode === m ? 'white' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: mode === m ? '600' : '400', fontSize: '13px',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}>{m === 'login' ? 'Prihlásenie' : 'Registrácia'}</button>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {mode === 'register' && (
              <>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Celé meno *</label><input className="input" type="text" placeholder="Ján Novák" value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Prezývka (viditeľná v rezerváciách) *</label><input className="input" type="text" placeholder="@jano88" value={nickname} onChange={e => setNickname(e.target.value.replace('@', ''))} required /></div>
                <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Telefón</label><input className="input" type="tel" placeholder="+421 900 000 000" value={phone} onChange={e => setPhone(e.target.value)} /></div>
              </>
            )}
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Email *</label><input className="input" type="email" placeholder="jan@email.sk" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Heslo *</label><input className="input" type="password" placeholder="min. 6 znakov" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            {error && <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ background: '#2D6A4F', color: 'white', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: '600', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
              {loading ? 'Moment...' : mode === 'login' ? 'Prihlásiť sa' : 'Vytvoriť účet'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>Nemáš účet? Zaregistruj sa a potom kontaktuj trénera pre aktiváciu kreditov.</p>
      </div>
    </div>
  )
}
