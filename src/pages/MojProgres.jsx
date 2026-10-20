import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

const EF_URL = 'https://njkxzbwzmhovuzuoyndj.supabase.co/functions/v1/progress-logs'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa3h6Ynd6bWhvdnV6dW95bmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTgxOTgsImV4cCI6MjA5MTUzNDE5OH0.FmZldAabAE5Ac9YebKfiwwtzlC6ScRL77wJhTgZ6hjk'

const CATEGORY_LABEL = { sila: 'Sila', vzpieranie: 'Vzpieranie', gymnastika: 'Gymnastika', kondicia: 'Kondícia' }
const CATEGORY_ICON  = { sila: '🏋️', vzpieranie: '🥇', gymnastika: '🤸', kondicia: '🚴' }
const CATEGORIES = ['sila', 'vzpieranie', 'gymnastika', 'kondicia']

// ─── helpers ────────────────────────────────────────────────────────────────

function formatValue(log, metric) {
  if (!log) return '–'
  if (metric === 'weight_reps') {
    const kg = log.weight_kg != null ? `${log.weight_kg} kg` : ''
    const r  = log.reps != null ? `× ${log.reps}` : ''
    return [kg, r].filter(Boolean).join(' ')
  }
  if (metric === 'reps') return log.reps != null ? `${log.reps} opak.` : '–'
  if (metric === 'hold_time' || metric === 'finish_time') {
    const s = log.time_seconds
    if (s == null) return '–'
    const m = Math.floor(s / 60), sec = Math.round(s % 60)
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')} min` : `${sec} s`
  }
  if (metric === 'distance') return log.distance_m != null ? `${log.distance_m} m` : '–'
  if (metric === 'calories') return log.calories != null ? `${log.calories} kal` : '–'
  return '–'
}

function isPR(log, allLogs, metric) {
  // For weight_reps: PR = highest weight_kg for same reps; or highest weight regardless
  // Simple check: is this the best value among logs for same exercise?
  if (!allLogs?.length || !log) return false
  const active = allLogs.filter(l => !l.deleted_at)
  if (metric === 'weight_reps') {
    const sameReps = log.reps != null ? active.filter(l => l.reps === log.reps) : active
    const best = Math.max(...sameReps.map(l => l.weight_kg || 0))
    return (log.weight_kg || 0) >= best && (log.weight_kg || 0) > 0
  }
  if (metric === 'reps') return (log.reps || 0) >= Math.max(...active.map(l => l.reps || 0))
  if (metric === 'hold_time') return (log.time_seconds || 0) >= Math.max(...active.map(l => l.time_seconds || 0))
  if (metric === 'finish_time') return (log.time_seconds || 0) > 0 && (log.time_seconds || 0) <= Math.min(...active.filter(l=>l.time_seconds).map(l => l.time_seconds))
  if (metric === 'calories') return (log.calories || 0) >= Math.max(...active.map(l => l.calories || 0))
  if (metric === 'distance') return (log.distance_m || 0) >= Math.max(...active.map(l => l.distance_m || 0))
  return false
}

function getBestLog(logs, metric) {
  if (!logs?.length) return null
  const active = logs.filter(l => !l.deleted_at)
  if (!active.length) return null
  if (metric === 'weight_reps') return active.reduce((best, l) => (l.weight_kg || 0) > (best.weight_kg || 0) ? l : best, active[0])
  if (metric === 'reps') return active.reduce((best, l) => (l.reps || 0) > (best.reps || 0) ? l : best, active[0])
  if (metric === 'hold_time') return active.reduce((best, l) => (l.time_seconds || 0) > (best.time_seconds || 0) ? l : best, active[0])
  if (metric === 'finish_time') return active.filter(l => l.time_seconds).reduce((best, l) => (l.time_seconds || 999999) < (best.time_seconds || 999999) ? l : best, active[0])
  if (metric === 'calories') return active.reduce((best, l) => (l.calories || 0) > (best.calories || 0) ? l : best, active[0])
  if (metric === 'distance') return active.reduce((best, l) => (l.distance_m || 0) > (best.distance_m || 0) ? l : best, active[0])
  return active[0]
}

async function apiFetch(user, path, options = {}) {
  const token = await user.getIdToken()
  const res = await fetch(`${EF_URL}/${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ─── Mini sparkline ──────────────────────────────────────────────────────────
function Sparkline({ logs, metric }) {
  if (!logs?.length) return null
  const active = [...logs].filter(l => !l.deleted_at).slice(0, 10).reverse()
  if (active.length < 2) return null
  const vals = active.map(l => {
    if (metric === 'weight_reps') return l.weight_kg || 0
    if (metric === 'reps') return l.reps || 0
    if (metric === 'hold_time' || metric === 'finish_time') return l.time_seconds || 0
    if (metric === 'calories') return l.calories || 0
    if (metric === 'distance') return l.distance_m || 0
    return 0
  })
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 60, H = 24
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Log form ────────────────────────────────────────────────────────────────
function LogForm({ exercise, existingLog, onSave, onCancel }) {
  const metric = exercise.metric
  const [weightKg, setWeightKg] = useState(existingLog?.weight_kg ?? '')
  const [reps, setReps]         = useState(existingLog?.reps ?? '')
  const [minutes, setMinutes]   = useState(existingLog?.time_seconds != null ? Math.floor(existingLog.time_seconds / 60) : '')
  const [seconds, setSeconds]   = useState(existingLog?.time_seconds != null ? Math.round(existingLog.time_seconds % 60) : '')
  const [distance, setDistance] = useState(existingLog?.distance_m ?? '')
  const [calories, setCalories] = useState(existingLog?.calories ?? '')
  const [note, setNote]         = useState(existingLog?.note ?? '')
  const [date, setDate]         = useState(existingLog?.performed_on ?? new Date().toISOString().split('T')[0])
  const [saving, setSaving]     = useState(false)

  const inp = { border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', fontSize: '15px', width: '100%', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
  const label = { fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { performed_on: date, note: note || undefined }
      if (metric === 'weight_reps') {
        body.weight_kg = weightKg !== '' ? parseFloat(weightKg) : undefined
        body.reps = reps !== '' ? parseInt(reps) : undefined
      } else if (metric === 'reps') {
        body.reps = reps !== '' ? parseInt(reps) : undefined
      } else if (metric === 'hold_time' || metric === 'finish_time') {
        const m = minutes !== '' ? parseInt(minutes) : 0
        const s = seconds !== '' ? parseInt(seconds) : 0
        body.time_seconds = m * 60 + s
      } else if (metric === 'distance') {
        body.distance_m = distance !== '' ? parseFloat(distance) : undefined
      } else if (metric === 'calories') {
        body.calories = calories !== '' ? parseFloat(calories) : undefined
      }
      await onSave(body)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {metric === 'weight_reps' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <span style={label}>Váha (kg)</span>
            <input style={inp} type="number" step="0.5" min="0" placeholder="napr. 80" value={weightKg} onChange={e => setWeightKg(e.target.value)} />
          </div>
          <div>
            <span style={label}>Opakovania</span>
            <input style={inp} type="number" min="1" placeholder="napr. 5" value={reps} onChange={e => setReps(e.target.value)} />
          </div>
        </div>
      )}
      {metric === 'reps' && (
        <div>
          <span style={label}>Opakovania</span>
          <input style={inp} type="number" min="1" placeholder="napr. 10" value={reps} onChange={e => setReps(e.target.value)} />
        </div>
      )}
      {(metric === 'hold_time' || metric === 'finish_time') && (
        <div>
          <span style={label}>{metric === 'hold_time' ? 'Čas výdrže' : 'Čas dokončenia'}</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <input style={inp} type="number" min="0" placeholder="min" value={minutes} onChange={e => setMinutes(e.target.value)} />
            <input style={inp} type="number" min="0" max="59" placeholder="sek" value={seconds} onChange={e => setSeconds(e.target.value)} />
          </div>
        </div>
      )}
      {metric === 'distance' && (
        <div>
          <span style={label}>Vzdialenosť (m)</span>
          <input style={inp} type="number" min="0" step="1" placeholder="napr. 500" value={distance} onChange={e => setDistance(e.target.value)} />
        </div>
      )}
      {metric === 'calories' && (
        <div>
          <span style={label}>Kalórie</span>
          <input style={inp} type="number" min="0" step="1" placeholder="napr. 100" value={calories} onChange={e => setCalories(e.target.value)} />
        </div>
      )}
      <div>
        <span style={label}>Dátum</span>
        <input style={inp} type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
      </div>
      <div>
        <span style={label}>Poznámka (nepovinné)</span>
        <input style={inp} type="text" placeholder="napr. osobný rekord, únava..." value={note} onChange={e => setNote(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: 'var(--text-muted)' }}>
          Zrušiť
        </button>
        <button type="submit" disabled={saving} style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Ukladám...' : (existingLog ? 'Uložiť zmeny' : 'Zapísať výkon')}
        </button>
      </div>
    </form>
  )
}

// ─── PR popup ────────────────────────────────────────────────────────────────
function PRPopup({ exercise, log, metric, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px', padding: '32px 24px', textAlign: 'center', maxWidth: '320px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '56px', marginBottom: '8px' }}>🏆</div>
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: '700', color: 'var(--green)', margin: '0 0 6px' }}>Osobný rekord!</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '0 0 16px' }}>{exercise.name}</p>
        <div style={{ background: 'var(--page-bg)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
          <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--ink)' }}>{formatValue(log, metric)}</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 20px' }}>BaseGym – Tvoja najlepšia hodina dňa.</p>
        <button onClick={onClose} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
          Zavrieť 💪
        </button>
      </div>
    </div>
  )
}

// ─── Exercise detail (chart + history) ──────────────────────────────────────
function ExerciseDetail({ exercise, logs, onBack, onAdd, onEdit, onDelete }) {
  const [editingLog, setEditingLog] = useState(null)
  const active = (logs || []).filter(l => !l.deleted_at).sort((a, b) => new Date(b.performed_on) - new Date(a.performed_on))
  const best = getBestLog(active, exercise.metric)

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', padding: '0 0 16px', marginBottom: '4px' }}>
        ← Späť
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '28px' }}>{CATEGORY_ICON[exercise.category]}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{exercise.name}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{CATEGORY_LABEL[exercise.category]}</span>
        </div>
      </div>

      {best && (
        <div style={{ background: 'var(--green)', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', color: 'white' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', opacity: 0.8, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Osobný rekord</div>
          <div style={{ fontSize: '26px', fontWeight: '800', fontFamily: "'DM Mono', monospace" }}>{formatValue(best, exercise.metric)}</div>
          <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '2px' }}>{best.performed_on}</div>
        </div>
      )}

      <button onClick={onAdd} style={{ width: '100%', padding: '13px', borderRadius: '12px', border: 'none', background: 'var(--ink)', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginBottom: '24px' }}>
        + Zapísať nový výkon
      </button>

      {active.length > 0 ? (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>História</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {active.map(log => {
              const pr = isPR(log, active, exercise.metric)
              return (
                <div key={log.id} style={{ background: 'white', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>{formatValue(log, exercise.metric)}</span>
                      {pr && <span style={{ fontSize: '11px', background: '#FFF9C4', color: '#F57F17', fontWeight: '700', padding: '2px 7px', borderRadius: '999px' }}>PR 🏆</span>}
                      {log.entered_by === 'staff' && <span style={{ fontSize: '11px', background: '#E8F5E9', color: '#2E7D32', fontWeight: '600', padding: '2px 7px', borderRadius: '999px' }}>tréner</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {log.performed_on}
                      {log.note && <span style={{ marginLeft: '8px' }}>· {log.note}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setEditingLog(log)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '13px' }}>✏️</button>
                    <button onClick={() => onDelete(log.id)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'white', cursor: 'pointer', fontSize: '13px' }}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>📝</div>
          <p>Zatiaľ žiadne výkony. Zapíš prvý!</p>
        </div>
      )}

      {editingLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: '680px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '17px', fontWeight: '800' }}>Upraviť výkon</h3>
            <LogForm exercise={exercise} existingLog={editingLog} onCancel={() => setEditingLog(null)} onSave={async (body) => { await onEdit(editingLog.id, body); setEditingLog(null) }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MojProgres() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [logsByEx, setLogsByEx]   = useState({})
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('overview') // overview | log | detail
  const [selectedEx, setSelectedEx] = useState(null)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [prPopup, setPrPopup]     = useState(null) // { exercise, log }
  const [error, setError]         = useState('')

  const loadExercises = useCallback(async () => {
    try {
      const data = await apiFetch(user, 'exercises')
      setExercises(data)
    } catch (e) { setError('Nepodarilo sa načítať cviky.') }
  }, [user])

  const loadLogs = useCallback(async () => {
    try {
      const data = await apiFetch(user, 'logs')
      // Group by exercise_id
      const byEx = {}
      data.forEach(l => { (byEx[l.exercise_id] = byEx[l.exercise_id] || []).push(l) })
      setLogsByEx(byEx)
    } catch (e) { console.error(e) }
  }, [user])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadExercises(), loadLogs()]).finally(() => setLoading(false))
  }, [loadExercises, loadLogs])

  async function handleAddLog(body) {
    const data = await apiFetch(user, 'logs', { method: 'POST', body: JSON.stringify({ ...body, exercise_id: selectedEx.id }) })
    await loadLogs()
    // Check PR
    const newLogs = [...(logsByEx[selectedEx.id] || []), data]
    if (isPR(data, newLogs, selectedEx.metric)) {
      setPrPopup({ exercise: selectedEx, log: data })
    }
    setView('detail')
  }

  async function handleEditLog(id, body) {
    await apiFetch(user, `logs/${id}`, { method: 'PUT', body: JSON.stringify(body) })
    await loadLogs()
  }

  async function handleDeleteLog(id) {
    if (!confirm('Naozaj chceš zmazať tento výkon?')) return
    await apiFetch(user, `logs/${id}`, { method: 'DELETE' })
    await loadLogs()
  }

  const filteredExercises = exercises.filter(ex => {
    const matchCat = catFilter === 'all' || ex.category === catFilter
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Exercises with at least one log
  const exercisesWithLogs = exercises.filter(ex => (logsByEx[ex.id] || []).filter(l => !l.deleted_at).length > 0)

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
      Načítavam...
    </div>
  )

  if (error) return (
    <div style={{ background: '#FFEBEE', borderRadius: '12px', padding: '16px', color: '#B71C1C', textAlign: 'center' }}>{error}</div>
  )

  // ── Detail view ──
  if (view === 'detail' && selectedEx) {
    return (
      <>
        <ExerciseDetail
          exercise={selectedEx}
          logs={logsByEx[selectedEx.id] || []}
          onBack={() => { setView('overview'); setSelectedEx(null) }}
          onAdd={() => setView('log')}
          onEdit={handleEditLog}
          onDelete={handleDeleteLog}
        />
        {prPopup && <PRPopup exercise={prPopup.exercise} log={prPopup.log} metric={prPopup.exercise.metric} onClose={() => setPrPopup(null)} />}
      </>
    )
  }

  // ── Log form view ──
  if (view === 'log' && selectedEx) {
    return (
      <div>
        <button onClick={() => setView(selectedEx ? 'detail' : 'overview')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', fontWeight: '600', padding: '0 0 16px', marginBottom: '4px' }}>
          ← Späť
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '28px' }}>{CATEGORY_ICON[selectedEx.category]}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{selectedEx.name}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{CATEGORY_LABEL[selectedEx.category]}</span>
          </div>
        </div>
        <LogForm exercise={selectedEx} onCancel={() => setView('detail')} onSave={handleAddLog} />
      </div>
    )
  }

  // ── Overview + exercise picker (when selecting for new log from overview) ──
  const selectingForLog = view === 'select'

  return (
    <div>
      {prPopup && <PRPopup exercise={prPopup.exercise} log={prPopup.log} metric={prPopup.exercise.metric} onClose={() => setPrPopup(null)} />}

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: '22px', fontWeight: '800', color: 'var(--ink)', margin: '0 0 4px' }}>
          Môj progres
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>BaseGym – Tvoja najlepšia hodina dňa.</p>
      </div>

      {/* Quick action */}
      <button onClick={() => setView('select')} style={{ width: '100%', padding: '15px', borderRadius: '14px', border: 'none', background: 'var(--green)', color: 'white', fontSize: '16px', fontWeight: '800', cursor: 'pointer', marginBottom: '28px', letterSpacing: '-0.01em' }}>
        + Zapísať výkon
      </button>

      {/* PR cards / exercise summaries */}
      {exercisesWithLogs.length > 0 ? (
        <div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Moje rekordy
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {exercisesWithLogs.map(ex => {
              const logs = (logsByEx[ex.id] || []).filter(l => !l.deleted_at)
              const best = getBestLog(logs, ex.metric)
              return (
                <button key={ex.id} onClick={() => { setSelectedEx(ex); setView('detail') }} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{CATEGORY_ICON[ex.category]}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>{ex.name}</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--ink)', fontFamily: "'DM Mono', monospace" }}>{formatValue(best, ex.metric)}</div>
                  <div style={{ marginTop: '8px' }}><Sparkline logs={logs} metric={ex.metric} /></div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏅</div>
          <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--ink)', margin: '0 0 8px' }}>Zatiaľ žiadne výkony</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>Zapíš prvý výkon a sleduj, ako rastieš.</p>
        </div>
      )}

      {/* Exercise selector bottom sheet */}
      {selectingForLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setView('overview')}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: '680px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>Vybrať cvik</h3>
              <button onClick={() => setView('overview')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--text-muted)' }}>✕</button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
              <input
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                placeholder="Hľadať cvik..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            {/* Category chips */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button onClick={() => setCatFilter('all')} style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: catFilter === 'all' ? 'var(--ink)' : 'var(--page-bg)', color: catFilter === 'all' ? 'white' : 'var(--text-muted)' }}>
                Všetky
              </button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '5px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', background: catFilter === c ? 'var(--green)' : 'var(--page-bg)', color: catFilter === c ? 'white' : 'var(--text-muted)' }}>
                  {CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
            {/* Exercise list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredExercises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Žiadny cvik nenájdený</div>
              ) : (
                filteredExercises.map(ex => {
                  const hasLogs = (logsByEx[ex.id] || []).filter(l => !l.deleted_at).length > 0
                  const best = hasLogs ? getBestLog((logsByEx[ex.id] || []).filter(l => !l.deleted_at), ex.metric) : null
                  return (
                    <button key={ex.id} onClick={() => { setSelectedEx(ex); setSearch(''); setCatFilter('all'); setView('log') }} style={{ width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: '10px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '20px' }}>{CATEGORY_ICON[ex.category]}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink)' }}>{ex.name}</div>
                        {best && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>PR: {formatValue(best, ex.metric)}</div>}
                      </div>
                      {hasLogs && <span style={{ fontSize: '11px', background: '#E8F5E9', color: '#2E7D32', fontWeight: '700', padding: '3px 8px', borderRadius: '999px' }}>✓</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
