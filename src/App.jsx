import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import TrainerPanel from './pages/TrainerPanel'
import './index.css'

function AppInner() {
  const { user, profile, loading, isTrainer } = useAuth()
  const [tab, setTab] = useState('calendar')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="BaseGym" style={{ width: '60px', height: '60px', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Načítavam...</p>
      </div>
    </div>
  )

  if (!user) return <Auth />

  const tabs = [
    { id: 'calendar', label: 'Rezervácie' },
    { id: 'profile', label: 'Môj profil' },
  ]
  if (isTrainer) tabs.push({ id: 'trainer', label: 'Tréner' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: '56px', gap: '10px' }}>
          <img src="/logo.png" alt="BaseGym BB" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />
          <span className="display" style={{ fontSize: '18px', color: 'var(--green-dark)', flex: 1 }}>BASEGYM BB</span>
          {profile?.full_name && <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '4px' }}>👋 {profile.full_name.split(' ')[0]}</span>}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 14px', borderRadius: '999px',
                border: `1.5px solid ${tab === t.id ? 'var(--green)' : 'transparent'}`,
                background: tab === t.id ? 'var(--green-bg)' : 'none',
                color: tab === t.id ? 'var(--green-dark)' : 'var(--text-muted)',
                fontWeight: tab === t.id ? '600' : '400', fontSize: '13px', cursor: 'pointer'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'calendar' && <Calendar />}
        {tab === 'profile' && <Profile />}
        {tab === 'trainer' && isTrainer && <TrainerPanel />}
      </div>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
