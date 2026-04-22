import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import './index.css'

function AppInner() {
  const { user, profile, loading, signOut } = useAuth()
  const [tab, setTab] = useState('calendar')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.png" alt="BaseGym" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Načítavam...</p>
      </div>
    </div>
  )

  if (!user) return <Auth />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: '54px', gap: '8px' }}>
          <img src="/logo.png" alt="BaseGym BB" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <span style={{ fontWeight: '600', fontSize: '14px', flex: 1 }}>BaseGym BB</span>
          {profile?.full_name && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginRight: '4px' }}>
              👋 {profile.full_name.split(' ')[0]}
            </span>
          )}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'calendar', label: 'Rezervácie', color: '#2D6A4F', bg: '#D8F3DC', border: '#2D6A4F' },
              { id: 'profile', label: 'Môj profil', color: '#1E3A8A', bg: '#DBEAFE', border: '#1D4ED8' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 14px', borderRadius: '999px',
                border: `1.5px solid ${tab === t.id ? t.border : 'transparent'}`,
                background: tab === t.id ? t.bg : 'none',
                color: tab === t.id ? t.color : 'var(--text-muted)',
                fontWeight: tab === t.id ? '600' : '400',
                fontSize: '13px', cursor: 'pointer'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'calendar' ? <Calendar /> : <Profile />}
      </div>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
