import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Auth from './pages/Auth'
import Calendar from './pages/Calendar'
import Profile from './pages/Profile'
import Info from './pages/Info'
import TrainerPanel from './pages/TrainerPanel'
import { supabase } from './lib/supabase'
import './index.css'

const MEMBERSHIP_LABEL = { gold: 'Gold', silver: 'Silver', basic: 'Basic kurz', single: 'Jednorázový' }

const FEMALE_EMOJIS = ['🦄', '💄', '🐹', '🐒', '❤️', '🌺']
const MALE_EMOJIS = ['🕵️‍♂️', '🏋🏻‍♂️', '🕺', '🥇', '🧸']

// Jednoduchý odhad podľa krstného mena (slovenské ženské mená takmer vždy
// končia na "a"). Nie je to 100% presné, ale na zábavné emoji a jemné farby v hlavičke stačí.
function isFemale(fullName) {
  const first = (fullName || '').trim().split(' ')[0].toLowerCase()
  return first.endsWith('a')
}

function pickAvatarEmoji(uid, fullName) {
  const list = isFemale(fullName) ? FEMALE_EMOJIS : MALE_EMOJIS
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

  const female = profile ? isFemale(profile.full_name) : false
  useEffect(() => {
    document.documentElement.setAttribute('data-gender', female ? 'f' : 'm')
  }, [female])

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
    { id: 'info', label: 'Informácie' },
  ]
  if (isTrainer) tabs.push({ id: 'trainer', label: 'Tréner' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--page-bg)' }}>
      <div style={{ background: 'white', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: '52px', gap: '9px' }}>
          <img src="/logo.png" alt="BaseGym BB" style={{ width: '30px', height: '30px', objectFit: 'contain', flexShrink: 0, borderRadius: '7px' }} />
          <span className="display" style={{ fontSize: '17px', color: 'var(--name-color)', flex: 1 }}>BaseGym BB</span>
          {profile && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)' }}>{profile.nickname || profile.full_name?.split(' ')[0]}</span>
              {membership && (
                <span style={{ background: 'var(--badge-bg)', color: 'var(--badge-text)', fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>
                  {MEMBERSHIP_LABEL[membership] || membership}
                </span>
              )}
            </span>
          )}
        </div>
        <div style={{ background: 'var(--menu-bg)', borderTop: '1px solid var(--border)', borderBottom: '2px solid var(--menu-accent)' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', padding: '6px 16px', display: 'flex', gap: '4px' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '6px 13px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--menu-active-bg)' : 'transparent',
                color: tab === t.id ? 'var(--menu-active-text)' : 'var(--text-muted)',
                fontWeight: tab === t.id ? '700' : '500', fontSize: '12.5px',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 20px 40px' }}>
        {tab === 'calendar' && <Calendar />}
        {tab === 'profile' && <Profile />}
        {tab === 'info' && <Info />}
        {tab === 'trainer' && isTrainer && <TrainerPanel />}
      </div>
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>
}
