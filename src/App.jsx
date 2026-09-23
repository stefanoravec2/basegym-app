import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import TrainerPanel from './pages/TrainerPanel'
import { supabase } from './lib/supabase'
import './index.css'

const MEMBERSHIP_LABEL = { gold: 'Gold', silver: 'Silver', basic: 'Basic kurz', single: 'Jednorázový' }

const FEMALE_EMOJIS = ['🦄', '💄', '🐹', '🐒', '❤️', '🌺']
const MALE_EMOJIS = ['🕵️‍♂️', '🏋🏻‍♂️', '🕺', '🥇', '🧸']

// Jednoduchý odhad podľa krstného mena (slovenské ženské mená takmer vždy
// končia na "a"). Nie je to 100% presné, ale na zábavné emoji v hlavičke stačí.
function pickAvatarEmoji(uid, fullName) {
  const first = (fullName || '').trim().split(' ')[0].toLowerCase()
  const list = first.endsWith('a') ? FEMALE_EMOJIS : MALE_EMOJIS
  let hash = 0
  for (let i = 0; i < (uid || '').length; i++) hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
  return list[hash % list.length]
}

function AppInner() {
  const { user, profile, loading, isTrainer } = useAuth()
  const [tab, setTab] = useState('calendar')
  const [membership, setMembership] = useState(null)

  useEffect(() => {
    if (!user) { setMembership(null); return }
    const today = new Date().toISOString().split('T')[0]
    supabase.from('credits').select('membership_type')
      .eq('client_firebase_uid', user.uid).eq('is_active', true)
      .lte('starts_at', today).gte('expires_at', today)
      .order('expires_at').limit(1).maybeSingle()
      .then(({ data }) => setMembership(data?.membership_type || null))
  }, [user])

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
    { id: 'calendar', label: 'Rezervácie', icon: '📅' },
    { id: 'profile', label: 'Môj profil', icon: '👤' },
  ]
  if (isTrainer) tabs.push({ id: 'trainer', label: 'Tréner', icon: '🧑‍🏫' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: '56px', gap: '10px' }}>
          <img src="/logo.png" alt="BaseGym BB" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0, borderRadius: '8px' }} />
          <span className="display" style={{ fontSize: '18px', color: 'var(--green-dark)', flex: 1 }}>BaseGym BB</span>
          {profile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)' }}>{pickAvatarEmoji(user?.uid, profile.full_name)} {profile.nickname || profile.full_name?.split(' ')[0]}</span>
              {membership && (
                <span style={{ background: 'var(--green-bg)', color: 'var(--green-dark)', fontSize: '11px', fontWeight: '700', padding: '3px 9px', borderRadius: '999px' }}>
                  {MEMBERSHIP_LABEL[membership] || membership}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 20px 90px', width: '100%', flex: 1 }}>
        {tab === 'calendar' && <Calendar />}
        {tab === 'profile' && <Profile />}
        {tab === 'trainer' && isTrainer && <TrainerPanel />}
      </div>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)', zIndex: 100
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', padding: '8px 0' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              color: tab === t.id ? 'var(--green-dark)' : 'var(--text-hint)',
              fontWeight: tab === t.id ? '700' : '400', fontSize: '10.5px'
            }}>
              <span style={{ fontSize: '19px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
