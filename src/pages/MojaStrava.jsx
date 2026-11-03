import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ═══ CONSTANTS ═══════════════════════════════════════════════════════════════

const GOALS = {
  A: { label: 'Chcem schudnúť', color: '#3A9428', icon: '🔥', sub: 'Mierny deficit · dostatok bielkovín · zachovanie sily' },
  B: { label: 'Chcem spevniť a zlepšiť kondíciu', color: '#2874A6', icon: '💪', sub: 'Pravidelný tréning · kvalitná strava · vyrovnaná energia' },
  C: { label: 'Chcem nabrať svaly', color: '#D4880F', icon: '🏆', sub: 'Progresívny tréning · nadbytok energie · bielkoviny' },
}

const HABITS = [
  { key: 'protein',    q: 'Mal/a si bielkoviny v každom hlavnom jedle?', icon: '🥩' },
  { key: 'veggies',    q: 'Zelenina alebo ovocie aspoň 2× dnes?',       icon: '🥦' },
  { key: 'water',      q: 'Vypil/a si dosť vody?',                       icon: '💧' },
  { key: 'regularity', q: 'Jedol/a si pravidelne (bez vynechávania)?',   icon: '🕐' },
]

const SCORE_EMOJI = { 3: '✅', 2: '⚠️', 1: '❌' }
const SCORE_LABEL = { 3: 'Áno', 2: 'Väčšinou', 1: 'Nie' }
const SCORE_COLORS = { 3: '#3A9428', 2: '#E8A317', 1: '#C0392B' }

const DAY_NAMES = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

// ═══ HELPERS ═════════════════════════════════════════════════════════════════

function today() { return new Date().toISOString().split('T')[0] }

function getMonday(d) {
  const dt = new Date(d)
  const day = dt.getDay()
  const diff = day === 0 ? -6 : 1 - day
  dt.setDate(dt.getDate() + diff)
  return dt.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function formatDate(d) {
  const dt = new Date(d)
  return `${dt.getDate()}.${dt.getMonth() + 1}.`
}

// ═══ STYLES ══════════════════════════════════════════════════════════════════

const card = {
  background: 'white', borderRadius: '16px', padding: '20px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: '16px',
}
const btn = (bg, color = 'white') => ({
  background: bg, color, border: 'none', borderRadius: '12px',
  padding: '14px 24px', fontSize: '15px', fontWeight: '700',
  cursor: 'pointer', width: '100%', fontFamily: 'inherit',
})
const chip = (active, color) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', borderRadius: '999px', cursor: 'pointer', border: 'none',
  fontFamily: 'inherit', fontSize: '14px', fontWeight: '600',
  background: active ? color : 'var(--bg, #f5f5f5)',
  color: active ? 'white' : 'var(--text-muted, #888)',
  transition: 'all 0.2s',
})

// ═══ ONBOARDING ══════════════════════════════════════════════════════════════

function Onboarding({ onSelect }) {
  const [selected, setSelected] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  if (showGuide && selected) {
    const g = GOALS[selected]
    const tips = {
      A: [
        'Jedz pravidelne, nevynechávaj jedlá',
        'Zvýš objem zeleniny na tanieri',
        'Obmedz tekuté kalórie (sladké nápoje, alkohol)',
        'Bielkoviny do každého hlavného jedla',
      ],
      B: [
        'Jedz približne na úrovni svojej potreby',
        'Sleduj silu, kondíciu a obvod pása',
        'Kvalitné bielkoviny a zelenina sú základ',
        'Váha sa nemusí meniť — sleduj ako sa cítiš',
      ],
      C: [
        'Pridávaj prílohy alebo desiatu, nie sladkosti',
        'Bielkoviny 1.6–2.0 g na kg váhy',
        'Jedz pred a po tréningu',
        'Mierny nadbytok energie, nie prejedanie',
      ],
    }
    return (
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '40px' }}>{g.icon}</span>
          <h3 style={{ margin: '8px 0 4px', color: g.color, fontSize: '18px' }}>{g.label}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{g.sub}</p>
        </div>
        <div style={{ background: 'var(--bg, #f8f8f8)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px', color: 'var(--text)' }}>Tvoje pravidlá:</p>
          {tips[selected].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ color: g.color, fontWeight: '700', fontSize: '14px' }}>✓</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: '0 0 12px' }}>
          Každý deň ti položíme 4 jednoduché otázky. Trvá to 30 sekúnd.
        </p>
        <button style={btn(g.color)} onClick={() => onSelect(selected)}>
          Začať sledovať stravu
        </button>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '36px' }}>🥗</span>
        <h2 style={{ margin: '8px 0 4px', fontSize: '20px', color: 'var(--text)' }}>Moja strava</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
          Vyber si svoj cieľ a začni sledovať stravovanie. Žiadne počítanie kalórií — len 4 jednoduché návyky.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {Object.entries(GOALS).map(([key, g]) => (
          <button key={key} onClick={() => { setSelected(key); setShowGuide(true) }} style={{
            background: selected === key ? g.color : 'white',
            color: selected === key ? 'white' : 'var(--text)',
            border: `2px solid ${selected === key ? g.color : 'var(--border, #e0e0e0)'}`,
            borderRadius: '14px', padding: '16px', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '28px' }}>{g.icon}</span>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>{key}: {g.label}</div>
                <div style={{ fontSize: '11.5px', opacity: 0.8, marginTop: '2px' }}>{g.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ═══ DAILY CHECK-IN ══════════════════════════════════════════════════════════

function DailyCheckin({ uid, goalType, existing, onSaved }) {
  const [scores, setScores] = useState({
    protein: existing?.protein || null,
    veggies: existing?.veggies || null,
    water: existing?.water || null,
    regularity: existing?.regularity || null,
  })
  const [rating, setRating] = useState(existing?.day_rating || null)
  const [note, setNote] = useState(existing?.note || '')
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(0) // 0-3 = habits, 4 = rating, 5 = done
  const isEdit = !!existing

  const allScored = Object.values(scores).every(v => v !== null)

  async function save() {
    if (!allScored) return
    setSaving(true)
    try {
      const row = {
        client_firebase_uid: uid,
        checkin_date: today(),
        ...scores,
        day_rating: rating || null,
        note: note || null,
      }
      if (isEdit) {
        await supabase.from('nutrition_checkins').update(row).eq('id', existing.id)
      } else {
        await supabase.from('nutrition_checkins').insert(row)
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  // Step-by-step flow
  if (step < 4) {
    const h = HABITS[step]
    const val = scores[h.key]
    return (
      <div style={card}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: '600' }}>
            {step + 1} / 4
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '16px' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: '40px', height: '4px', borderRadius: '2px',
                background: i <= step ? 'var(--green, #3A9428)' : 'var(--border, #e0e0e0)',
              }} />
            ))}
          </div>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '8px' }}>{h.icon}</span>
          <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: '0 0 20px' }}>{h.q}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '16px' }}>
            {[3, 2, 1].map(s => (
              <button key={s} onClick={() => {
                setScores(prev => ({ ...prev, [h.key]: s }))
                setTimeout(() => { if (step < 3) setStep(step + 1); else setStep(4) }, 300)
              }} style={{
                width: '90px', padding: '14px 0', borderRadius: '14px', border: 'none',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                background: val === s ? SCORE_COLORS[s] : 'var(--bg, #f5f5f5)',
                color: val === s ? 'white' : 'var(--text)',
                fontSize: '24px', fontWeight: '700',
                boxShadow: val === s ? `0 4px 12px ${SCORE_COLORS[s]}40` : 'none',
                transform: val === s ? 'scale(1.05)' : 'scale(1)',
              }}>
                <div>{SCORE_EMOJI[s]}</div>
                <div style={{ fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>{SCORE_LABEL[s]}</div>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{
              background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Späť</button>
          )}
        </div>
      </div>
    )
  }

  // Step 4: Rating + note + save
  return (
    <div style={card}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', margin: '0 0 4px' }}>
          Ako hodnotíš svoj dnešný stravovací deň?
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Voliteľné — môžeš preskočiť</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          {[1,2,3,4,5].map(r => (
            <button key={r} onClick={() => setRating(r === rating ? null : r)} style={{
              width: '44px', height: '44px', borderRadius: '12px', border: 'none',
              cursor: 'pointer', fontSize: '20px', fontFamily: 'inherit',
              background: r <= (rating || 0) ? '#3A9428' : 'var(--bg, #f5f5f5)',
              color: r <= (rating || 0) ? 'white' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}>★</button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Poznámka (voliteľné) — napr. čo si jedol/a, ako si sa cítil/a..."
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box', border: '1px solid var(--border, #e0e0e0)',
            borderRadius: '12px', padding: '10px 12px', fontSize: '14px',
            fontFamily: 'inherit', resize: 'none', outline: 'none', marginBottom: '16px',
          }}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setStep(3)} style={{
            ...btn('var(--bg, #f5f5f5)', 'var(--text-muted)'), width: 'auto', flex: '0 0 auto',
            padding: '14px 20px',
          }}>← Späť</button>
          <button style={btn('#3A9428')} onClick={save} disabled={saving || !allScored}>
            {saving ? 'Ukladám...' : isEdit ? 'Aktualizovať' : 'Uložiť check-in ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══ HEATMAP ═════════════════════════════════════════════════════════════════

function WeekHeatmap({ checkins, weekStart }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '4px 6px', color: 'var(--text-muted)', fontWeight: '600' }}></th>
            {days.map(d => {
              const dt = new Date(d)
              const isToday = d === today()
              return (
                <th key={d} style={{
                  padding: '4px 2px', textAlign: 'center', fontWeight: isToday ? '700' : '500',
                  color: isToday ? 'var(--green, #3A9428)' : 'var(--text-muted)',
                  fontSize: '11px',
                }}>
                  {DAY_NAMES[dt.getDay()]}<br/>{dt.getDate()}.
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {HABITS.map(h => (
            <tr key={h.key}>
              <td style={{ padding: '3px 6px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                {h.icon}
              </td>
              {days.map(d => {
                const ci = checkins.find(c => c.checkin_date === d)
                const val = ci?.[h.key]
                const bg = val === 3 ? '#3A942830' : val === 2 ? '#E8A31730' : val === 1 ? '#C0392B25' : 'var(--bg, #f8f8f8)'
                const fg = val ? SCORE_EMOJI[val] : '·'
                return (
                  <td key={d} style={{
                    textAlign: 'center', padding: '4px 2px',
                    background: bg, borderRadius: '6px', fontSize: '13px',
                  }}>{fg}</td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ═══ STREAK COUNTER ══════════════════════════════════════════════════════════

function computeStreak(checkins, freezes) {
  if (!checkins.length) return 0
  const checkinDates = new Set(checkins.map(c => c.checkin_date))
  const freezeDates = new Set((freezes || []).map(f => f.used_on))
  let streak = 0
  let d = today()
  // If no checkin today, start from yesterday
  if (!checkinDates.has(d) && !freezeDates.has(d)) d = addDays(d, -1)
  while (checkinDates.has(d) || freezeDates.has(d)) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

// ═══ WEEKLY SCORE ════════════════════════════════════════════════════════════

function WeeklyScore({ checkins, weekStart }) {
  const weekCheckins = checkins.filter(c => c.checkin_date >= weekStart && c.checkin_date < addDays(weekStart, 7))
  const count = weekCheckins.length
  if (!count) return (
    <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
      Zatiaľ žiadne check-iny tento týždeň
    </div>
  )

  const stats = HABITS.map(h => {
    const good = weekCheckins.filter(c => c[h.key] === 3).length
    return { ...h, good, total: count, pct: Math.round(good / count * 100) }
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      {stats.map(s => (
        <div key={s.key} style={{
          background: 'var(--bg, #f8f8f8)', borderRadius: '12px', padding: '12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: s.pct >= 70 ? '#3A9428' : s.pct >= 40 ? '#E8A317' : '#C0392B' }}>
            {s.good}/{s.total}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>dní splnených</div>
        </div>
      ))}
    </div>
  )
}

// ═══ TREND (last 4 weeks) ════════════════════════════════════════════════════

function TrendChart({ checkins }) {
  const weeks = []
  for (let i = 3; i >= 0; i--) {
    const ws = getMonday(addDays(today(), -i * 7))
    const we = addDays(ws, 7)
    const wc = checkins.filter(c => c.checkin_date >= ws && c.checkin_date < we)
    const avg = wc.length
      ? wc.reduce((s, c) => s + (c.protein + c.veggies + c.water + c.regularity) / 4, 0) / wc.length
      : 0
    weeks.push({ label: formatDate(ws), avg: Math.round(avg * 100) / 100, count: wc.length })
  }
  const maxAvg = Math.max(...weeks.map(w => w.avg), 3)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px', padding: '0 4px' }}>
      {weeks.map((w, i) => {
        const h = w.avg > 0 ? Math.max((w.avg / maxAvg) * 64, 8) : 4
        const color = w.avg >= 2.5 ? '#3A9428' : w.avg >= 1.5 ? '#E8A317' : w.avg > 0 ? '#C0392B' : 'var(--border, #ddd)'
        return (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: `${h}px`, background: color, borderRadius: '6px 6px 0 0',
              transition: 'height 0.3s', opacity: 0.8, margin: '0 auto', width: '80%',
            }} />
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{w.label}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{w.count}d</div>
          </div>
        )
      })}
    </div>
  )
}

// ═══ BADGES ══════════════════════════════════════════════════════════════════

function NutritionBadges({ streak, totalCheckins, checkins }) {
  const badges = []

  if (streak >= 7) badges.push({ icon: '🥗', label: '7 dní v rade', earned: true })
  else badges.push({ icon: '🥗', label: `7 dní v rade (${streak}/7)`, earned: false })

  const thisMonth = checkins.filter(c => c.checkin_date.startsWith(today().substring(0, 7))).length
  if (thisMonth >= 25) badges.push({ icon: '🏆', label: 'Konzistentný mesiac', earned: true })
  else badges.push({ icon: '🏆', label: `Konz. mesiac (${thisMonth}/25)`, earned: false })

  if (streak >= 90) badges.push({ icon: '🔥', label: '90 dní streak!', earned: true })
  else if (streak >= 30) badges.push({ icon: '🔥', label: `90 dní (${streak}/90)`, earned: false })

  if (totalCheckins >= 1) badges.push({ icon: '🌱', label: 'Prvý check-in', earned: true })

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {badges.map((b, i) => (
        <div key={i} style={{
          background: b.earned ? '#3A942815' : 'var(--bg, #f8f8f8)',
          borderRadius: '999px', padding: '6px 14px', fontSize: '12px', fontWeight: '600',
          color: b.earned ? '#3A9428' : 'var(--text-muted)',
          opacity: b.earned ? 1 : 0.6,
          display: 'flex', alignItems: 'center', gap: '5px',
        }}>
          <span style={{ fontSize: '15px' }}>{b.icon}</span>
          {b.label}
        </div>
      ))}
    </div>
  )
}

// ═══ MICRO CHALLENGE ═════════════════════════════════════════════════════════

function MicroChallenge({ uid, challenge, response, onRespond }) {
  if (!challenge) return null
  const done = response != null

  return (
    <div style={{
      ...card,
      background: done ? '#3A942810' : 'linear-gradient(135deg, #3A942810, #3A942805)',
      border: '1px solid #3A942830',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '24px' }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#3A9428', marginBottom: '4px' }}>VÝZVA TÝŽDŇA</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
            {challenge.challenge_text}
          </div>
          {done ? (
            <div style={{ fontSize: '13px', color: response.completed ? '#3A9428' : 'var(--text-muted)' }}>
              {response.completed ? '✅ Zvládol/a som to!' : '🔄 Nabudúce to dám'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onRespond(true)} style={{
                ...btn('#3A9428'), width: 'auto', padding: '8px 16px', fontSize: '13px',
              }}>Zvládol/a som ✓</button>
              <button onClick={() => onRespond(false)} style={{
                ...btn('var(--bg, #f0f0f0)', 'var(--text-muted)'), width: 'auto', padding: '8px 16px', fontSize: '13px',
              }}>Nabudúce</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══ SILENCE MODE ════════════════════════════════════════════════════════════

function SilenceToggle({ uid, silence, onUpdate }) {
  const [showPicker, setShowPicker] = useState(false)
  const isActive = silence && silence.silence_until >= today()

  if (isActive) {
    return (
      <div style={{
        background: 'var(--bg, #f8f8f8)', borderRadius: '12px', padding: '12px 16px',
        fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>😴 Ticho mód do {formatDate(silence.silence_until)}</span>
        <button onClick={async () => {
          await supabase.from('nutrition_silence').delete().eq('id', silence.id)
          onUpdate()
        }} style={{
          background: 'none', border: 'none', color: '#3A9428', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
        }}>Zrušiť</button>
      </div>
    )
  }

  if (showPicker) {
    const options = [3, 5, 7, 14]
    return (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {options.map(d => (
          <button key={d} onClick={async () => {
            await supabase.from('nutrition_silence').insert({
              client_firebase_uid: uid,
              silence_until: addDays(today(), d),
              reason: `${d} dní pauza`,
            })
            setShowPicker(false)
            onUpdate()
          }} style={chip(false, '#888')}>
            {d} dní
          </button>
        ))}
        <button onClick={() => setShowPicker(false)} style={chip(false, '#888')}>Zrušiť</button>
      </div>
    )
  }

  return (
    <button onClick={() => setShowPicker(true)} style={{
      background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px',
      cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0',
    }}>😴 Potrebujem pauzu</button>
  )
}

// ═══ STREAK FREEZE ═══════════════════════════════════════════════════════════

function StreakFreezeButton({ uid, freezes, onUsed }) {
  const [confirming, setConfirming] = useState(false)

  // Can use once per 14 days
  const lastFreeze = freezes.length ? freezes[freezes.length - 1].used_on : null
  const canFreeze = !lastFreeze || daysBetween(lastFreeze, today()) >= 14

  if (!canFreeze) {
    const nextDate = addDays(lastFreeze, 14)
    return (
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        🧊 Ďalší freeze od {formatDate(nextDate)}
      </span>
    )
  }

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Použiť freeze na dnes?</span>
        <button onClick={async () => {
          await supabase.from('nutrition_streak_freezes').insert({
            client_firebase_uid: uid, used_on: today(),
          })
          setConfirming(false)
          onUsed()
        }} style={chip(true, '#2874A6')}>Áno</button>
        <button onClick={() => setConfirming(false)} style={chip(false, '#888')}>Nie</button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} style={{
      background: 'none', border: 'none', color: '#2874A6', fontSize: '12px',
      cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
    }}>🧊 Streak freeze</button>
  )
}

// ═══ BEST DAY HIGHLIGHT ══════════════════════════════════════════════════════

function BestDay({ checkins, weekStart }) {
  const weekCheckins = checkins.filter(c => c.checkin_date >= weekStart && c.checkin_date < addDays(weekStart, 7))
  if (weekCheckins.length < 2) return null

  let best = weekCheckins[0]
  let bestScore = 0
  for (const c of weekCheckins) {
    const s = c.protein + c.veggies + c.water + c.regularity
    if (s > bestScore) { bestScore = s; best = c }
  }

  const dt = new Date(best.checkin_date)
  const dayName = ['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'][dt.getDay()]
  const perfectCount = [best.protein, best.veggies, best.water, best.regularity].filter(v => v === 3).length

  return (
    <div style={{
      background: '#3A942810', borderRadius: '10px', padding: '10px 14px',
      fontSize: '13px', color: '#3A9428', display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ fontSize: '18px' }}>⭐</span>
      <span><b>{dayName}</b> bol tvoj najlepší deň — {perfectCount}/4 návyky splnené na 100%</span>
    </div>
  )
}

// ═══ FRIDAY PROMPT ═══════════════════════════════════════════════════════════

function FridayPrompt({ onDismiss }) {
  const dayOfWeek = new Date().getDay()
  const [dismissed, setDismissed] = useState(false)
  if (dayOfWeek !== 5 || dismissed) return null

  const options = [
    { emoji: '🍕', text: 'Užijem si bez stresu' },
    { emoji: '🎯', text: 'Chcem dodržať návyky' },
    { emoji: '🔄', text: 'Mix oboch' },
  ]

  return (
    <div style={{ ...card, background: 'linear-gradient(135deg, #E8A31710, #E8A31705)', border: '1px solid #E8A31730' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '24px' }}>🗓️</span>
        <p style={{ fontSize: '14px', fontWeight: '700', margin: '4px 0 12px' }}>Víkend je tu — aký máš plán?</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {options.map((o, i) => (
            <button key={i} onClick={() => setDismissed(true)} style={chip(false, '#E8A317')}>
              {o.emoji} {o.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══ MAIN COMPONENT ══════════════════════════════════════════════════════════

export default function MojaStrava() {
  const { user } = useAuth()
  const [goal, setGoal] = useState(null)
  const [checkins, setCheckins] = useState([])
  const [freezes, setFreezes] = useState([])
  const [silence, setSilence] = useState(null)
  const [challenge, setChallenge] = useState(null)
  const [challengeResp, setChallengeResp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCheckin, setShowCheckin] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const uid = user?.uid

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Load all data
  useEffect(() => {
    if (!uid) return
    setLoading(true)
    Promise.all([
      supabase.from('nutrition_goals').select('*').eq('client_firebase_uid', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('nutrition_checkins').select('*').eq('client_firebase_uid', uid).order('checkin_date', { ascending: false }).limit(120),
      supabase.from('nutrition_streak_freezes').select('*').eq('client_firebase_uid', uid).order('used_on', { ascending: true }),
      supabase.from('nutrition_silence').select('*').eq('client_firebase_uid', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('nutrition_challenges').select('*').lte('week_start', today()).order('week_start', { ascending: false }).limit(1).maybeSingle(),
    ]).then(async ([goalRes, checkinsRes, freezeRes, silenceRes, challRes]) => {
      setGoal(goalRes.data)
      setCheckins(checkinsRes.data || [])
      setFreezes(freezeRes.data || [])
      setSilence(silenceRes.data)
      setChallenge(challRes.data)
      // Load challenge response if challenge exists
      if (challRes.data && uid) {
        const { data } = await supabase.from('nutrition_challenge_responses')
          .select('*').eq('client_firebase_uid', uid).eq('challenge_id', challRes.data.id)
          .maybeSingle()
        setChallengeResp(data)
      }
      setLoading(false)
    })
  }, [uid, refreshKey])

  const weekStart = getMonday(today())
  const todayCheckin = checkins.find(c => c.checkin_date === today())
  const streak = useMemo(() => computeStreak(checkins, freezes), [checkins, freezes])

  // Save goal from onboarding
  async function handleGoalSelect(goalType) {
    await supabase.from('nutrition_goals').insert({
      client_firebase_uid: uid, goal_type: goalType,
    })
    refresh()
  }

  // Respond to weekly challenge
  async function handleChallengeRespond(completed) {
    await supabase.from('nutrition_challenge_responses').insert({
      client_firebase_uid: uid, challenge_id: challenge.id, completed,
    })
    refresh()
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '13px' }}>Načítavam stravu...</p>
    </div>
  )

  // No goal set — show onboarding
  if (!goal) return <Onboarding onSelect={handleGoalSelect} />

  const g = GOALS[goal.goal_type]

  return (
    <div>
      {/* Header with goal + streak */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', background: g.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          }}>{g.icon}</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>Cieľ {goal.goal_type}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{g.label}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#3A9428' }}>{streak}🔥</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>dní v rade</div>
        </div>
      </div>

      {/* Friday weekend prompt */}
      <FridayPrompt />

      {/* Today's check-in button or edit */}
      {showCheckin || !todayCheckin ? (
        <>
          {!showCheckin && !todayCheckin && (
            <button onClick={() => setShowCheckin(true)} style={{
              ...btn('#3A9428'), marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              📝 Denný check-in
            </button>
          )}
          {showCheckin && (
            <DailyCheckin
              uid={uid}
              goalType={goal.goal_type}
              existing={todayCheckin}
              onSaved={() => { setShowCheckin(false); refresh() }}
            />
          )}
        </>
      ) : (
        <div style={{
          ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#3A942808',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#3A9428' }}>Dnes splnené</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {[todayCheckin.protein, todayCheckin.veggies, todayCheckin.water, todayCheckin.regularity]
                .map(v => SCORE_EMOJI[v]).join(' ')}
            </span>
          </div>
          <button onClick={() => setShowCheckin(true)} style={{
            background: 'none', border: 'none', color: '#3A9428', fontSize: '12px',
            fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
          }}>Upraviť</button>
        </div>
      )}

      {/* Weekly challenge */}
      <MicroChallenge
        uid={uid}
        challenge={challenge}
        response={challengeResp}
        onRespond={handleChallengeRespond}
      />

      {/* Weekly heatmap */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text)' }}>Tento týždeň</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {formatDate(weekStart)} – {formatDate(addDays(weekStart, 6))}
          </span>
        </div>
        <WeekHeatmap checkins={checkins} weekStart={weekStart} />
        <div style={{ marginTop: '12px' }}><BestDay checkins={checkins} weekStart={weekStart} /></div>
      </div>

      {/* Weekly score */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text)' }}>Týždenné skóre</h3>
        <WeeklyScore checkins={checkins} weekStart={weekStart} />
      </div>

      {/* 4-week trend */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text)' }}>Trend (posledné 4 týždne)</h3>
        <TrendChart checkins={checkins} />
      </div>

      {/* Badges */}
      <div style={card}>
        <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text)' }}>Achievementy</h3>
        <NutritionBadges streak={streak} totalCheckins={checkins.length} checkins={checkins} />
      </div>

      {/* Streak freeze + silence */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <StreakFreezeButton uid={uid} freezes={freezes} onUsed={refresh} />
        <SilenceToggle uid={uid} silence={silence} onUpdate={refresh} />
      </div>

      {/* Change goal */}
      <div style={{ textAlign: 'center', marginTop: '8px' }}>
        <button onClick={async () => {
          await supabase.from('nutrition_goals').update({ is_active: false }).eq('id', goal.id)
          refresh()
        }} style={{
          background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>Zmeniť cieľ</button>
      </div>
    </div>
  )
              }
