import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

function localDate(d) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TrainerPanel() {
  const { user } = useAuth()

  const [trainings, setTrainings] = useState([])
  const [trainerNames, setTrainerNames] = useState({})

  const [selectedTraining, setSelectedTraining] = useState(null)
  const [trainingReservations, setTrainingReservations] = useState([])
  const [searchClient, setSearchClient] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const [msg, setMsg] = useState({ text: '', type: 'green' })

  useEffect(() => { loadTrainings() }, [])

  function showMsg(text, type = 'green') {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: 'green' }), 3500)
  }

  // ── TRAININGS ──────────────────────────────────────────────

  async function loadTrainings() {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 21)
    const { data } = await supabase
      .from('trainings')
      .select('*, reservations(id, status, client_profiles(nickname, full_name))')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', maxDate.toISOString())
      .order('starts_at')
    setTrainings(data || [])
    const trainerIds = [...new Set((data || []).map(t => t.claimed_by_trainer_id).filter(Boolean))]
    if (trainerIds.length) {
      const { data: trs } = await supabase.from('trainer_directory').select('id, full_name').in('id', trainerIds)
      const map = {}
      ;(trs || []).forEach(t => { map[t.id] = t.full_name })
      setTrainerNames(map)
    } else {
      setTrainerNames({})
    }
  }

  // ── RESERVATIONS ──────────────────────────────────────────

  async function loadTrainingReservations(training) {
    setSelectedTraining(training)
    const { data } = await supabase
      .from('reservations')
      .select('*, client_profiles(id, full_name, nickname, email, firebase_uid)')
      .eq('training_id', training.id)
      .eq('status', 'active')
    setTrainingReservations(data || [])
  }

  async function removeReservation(res) {
    await supabase.from('reservations').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('id', res.id)
    const client = res.client_profiles
    const { data: cr } = await supabase.from('credits').select('*').eq('client_firebase_uid', res.client_firebase_uid).eq('is_active', true).lte('starts_at', localDate(new Date())).gte('expires_at', localDate(new Date())).order('expires_at').limit(1).maybeSingle()
    if (cr) {
      const refund = res.credits_deducted || 1
      await supabase.from('credits').update({ amount: cr.amount + refund }).eq('id', cr.id)
      await supabase.from('credit_logs').insert({ client_firebase_uid: res.client_firebase_uid, change_amount: refund, reason: `Odobratie z tréningu: ${selectedTraining?.title}` })
    }
    showMsg(`${client?.full_name || 'Klient'} odobratý, kredity vrátené`)
    loadTrainingReservations(selectedTraining)
  }

  async function searchClients(query) {
    if (query.length < 2) { setSearchResults([]); return }
    const { data } = await supabase.from('client_profiles').select('*').or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%,email.ilike.%${query}%`)
    const reservedUids = trainingReservations.map(r => r.client_profiles?.firebase_uid)
    setSearchResults((data || []).filter(c => !reservedUids.includes(c.firebase_uid)))
  }

  async function addClientManually(client) {
    const { data: cr } = await supabase.from('credits').select('*').eq('client_firebase_uid', client.firebase_uid).eq('is_active', true).lte('starts_at', localDate(new Date())).gte('expires_at', localDate(new Date())).order('expires_at').limit(1).maybeSingle()
    const cost = selectedTraining.credits_cost || 1
    const { error } = await supabase.from('reservations').insert({
      training_id: selectedTraining.id,
      client_firebase_uid: client.firebase_uid,
      client_id: client.id,
      credits_deducted: cost,
      status: 'active',
      added_manually: true,
      added_by_trainer: user.uid,
    })
    if (!error) {
      if (cr && cr.amount >= cost) {
        await supabase.from('credits').update({ amount: cr.amount - cost }).eq('id', cr.id)
        await supabase.from('credit_logs').insert({ client_firebase_uid: client.firebase_uid, client_id: client.id, change_amount: -cost, reason: `Tréner pridal na tréning: ${selectedTraining.title}`, training_id: selectedTraining.id })
      }
      showMsg(`${client.full_name} pridaný na tréning ✅`)
      setSearchClient(''); setSearchResults([]); loadTrainingReservations(selectedTraining)
    } else showMsg('Chyba: ' + error.message, 'red')
  }

  // ── UI HELPERS ────────────────────────────────────────────

  function formatDT(dt) {
    const d = new Date(dt)
    return d.toLocaleDateString('sk-SK', { weekday: 'short', day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  }

  const s = {
    card: { background: 'white', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', marginBottom: '12px' },
    btn: (color = 'var(--green-dark)', bg = 'var(--green-bg)') => ({ background: bg, color, border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }),
    btnRed: { background: 'var(--red-bg)', color: 'var(--red)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' },
    input: { width: '100%', border: '1.5px solid var(--border-md)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    label: { fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' },
    tag: (bg, color) => ({ background: bg, color, fontSize: '12px', borderRadius: '20px', padding: '3px 10px', fontWeight: '500' }),
  }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <h2 className="display" style={{ margin: '0 0 16px', fontSize: '24px' }}>Nadchádzajúce tréningy</h2>

      {msg.text && (
        <div className={`info-box ${msg.type === 'red' ? 'info-red' : 'info-green'}`} style={{ marginBottom: '16px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      {trainings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'white', border: '1px solid var(--border)', borderRadius: '14px' }}>
          <p>Žiadne tréningy v najbližších 21 dňoch</p>
        </div>
      ) : (
        trainings.map(t => {
          const activeRes = (t.reservations || []).filter(r => r.status === 'active')
          const full = activeRes.length >= t.capacity
          const isSelected = selectedTraining?.id === t.id
          return (
            <div key={t.id} style={{ ...s.card, border: isSelected ? '1.5px solid var(--green)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {formatDT(t.starts_at)} {t.location ? `· ${t.location}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {trainerNames[t.claimed_by_trainer_id] && <span className="trainer-chip">{trainerNames[t.claimed_by_trainer_id]}</span>}
                    <span className="badge badge-amber">{t.credits_cost || 1} kredit</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span className={`scoreboard ${full ? 'urgent' : ''}`}>{activeRes.length}/{t.capacity}</span>
                  <button onClick={() => isSelected ? setSelectedTraining(null) : loadTrainingReservations(t)} className="btn" style={{ fontSize: '13px', padding: '8px 16px' }}>
                    {isSelected ? 'Zavrieť' : 'Spravovať'}
                  </button>
                </div>
              </div>

              {isSelected && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px' }}>
                    Prihlásení ({trainingReservations.length})
                  </div>
                  {trainingReservations.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Nikto nie je prihlásený</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {trainingReservations.map(r => {
                        const nick = r.client_profiles?.nickname || r.client_profiles?.full_name?.split(' ')[0] || 'Klient'
                        return (
                          <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg)', borderRadius: '20px', padding: '4px 10px 4px 12px', fontSize: '12px' }}>
                            @{nick}
                            <button onClick={() => removeReservation(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div>
                    <label style={s.label}>Pridať klienta manuálne</label>
                    <input
                      style={s.input}
                      placeholder="Hľadaj podľa mena / nicku..."
                      value={searchClient}
                      onChange={e => { setSearchClient(e.target.value); searchClients(e.target.value) }}
                    />
                    {searchResults.length > 0 && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', overflow: 'hidden' }}>
                      {searchResults.map(c => (
                          <div key={c.id} onClick={() => addClientManually(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px', display: 'flex', justifyContent: 'space-between', background: 'white' }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseOut={e => e.currentTarget.style.background = 'white'}>
            <span><strong>{c.full_name}</strong> <span style={{ color: 'var(--text-muted)' }}>@{c.nickname}</span></span>
                            <span style={{ color: 'var(--green)', fontWeight: '600' }}>+ Pridať</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
