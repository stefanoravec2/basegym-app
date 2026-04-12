import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import './index.css'

function AppInner() {
  const { user, profile, loading } = useAuth()
  const [tab, setTab] = useState('calendar')

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', background: '#1A1A1A', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: '700', margin: '0 auto 12px' }}>BG</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Načítavam...</p>
      </div>
    </div>
  )

  if (!user) return <Auth />

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: '54px', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', background: '#1A1A1A', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>BG</div>
          <span style={{ fontWeight: '600', fontSize: '14px', flex: 1 }}>BaseGym BB</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'calendar', label: 'Rezervácie', bg: '#D8F3DC', border: '#2D6A4F', color: '#1B4332' },
              { id: 'profile', label: 'Môj profil', bg: '#DBEAFE', border: '#1D4ED8', color: '#1E3A8A' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 14px', borderRadius: '999px', border: `1.5px solid ${tab === t.id ? t.border : 'transparent'}`,
                background: tab === t.id ? t.bg : 'none',
                color: tab === t.id ? t.color : 'var(--text-muted)',
                fontWeight: tab === t.id ? '600' : '400',
                fontSize: '13px', cursor: 'pointer'
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'calendar' ? <Calendar /> : <Profile />}
      </div>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
