import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MEMBERSHIP_TYPES = [
  { id: 'single', label: '1 kredit / 7 dní', credits: 1, days: 7, price: 8 },
  { id: 'pack10', label: '10 kreditov / 30 dní', credits: 10, days: 30, price: 60 },
  { id: 'unlimited', label: 'Neobmedzene / 30 dní', credits: 999, days: 30, price: 80 },
  { id: 'pack20', label: '20 kreditov / 60 dní', credits: 20, days: 60, price: 110 },
]

function localDate(d) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function TrainerPanel() {
  const { user } = useAuth()

  // Tabs
  const [activeTab, setActiveTab] = useState('trainings')

  // Trainings
  const [trainings, setTrainings] = useState([])
  const [trainerNames, setTrainerNames] = useState({})

  // Reservations for selected training
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [trainingReservations, setTrainingReservations] = useState([])
  const [searchClient, setSearchClient] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Credits management
  const [creditTab, setCreditTab] = useState('add')
  const [creditSearch, setCreditSearch] = useState('')
  const [creditSearchResults, setCreditSearchResults] = useState([])
  const [selectedCreditClient, setSelectedCreditClient] = useState(null)
  const [selectedMembership, setSelectedMembership] = useState(MEMBERSHIP_TYPES[1])

  useEffect(() => {
    const start = new Date(membershipStart)
    const end = new Date(start)
    end.setDate(end.getDate() + selectedMembership.days)
    setMembershipEnd(localDate(end))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMembership, membershipStart])
  const [clientCredits, setClientCredits] = useState(null)
  const [membershipStart, setMembershipStart] = useState(localDate(new Date()))
  const [membershipEnd, setMembershipEnd] = useState('')

  // Messages
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

  // ── CREDITS ──────────────────────────────────────────────

  async function searchCreditClients(query) {
    if (query.length < 2) { setCreditSearchResults([]); return }
    const { data } = await supabase.from('client_profiles').select('*').or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%,email.ilike.%${query}%`)
    setCreditSearchResults(data || [])
  }

  async function selectCreditClient(client) {
    setSelectedCreditClient(client)
    setCreditSearch(client.full_name)
    setCreditSearchResults([])
    const { data } = await supabase.from('credits').select('*').eq('client_firebase_uid', client.firebase_uid).eq('is_active', true).lte('starts_at', localDate(new Date())).gte('expires_at', localDate(new Date())).order('expires_at').limit(1).maybeSingle()
    setClientCredits(data || null)
  }

  async function addMembership() {
    if (!selectedCreditClient) { showMsg('Vyber klienta', 'red'); return }
    if (!membershipStart || !membershipEnd) { showMsg('Zadaj platnosť od-do', 'red'); return }
    if (membershipEnd < membershipStart) { showMsg('Dátum "do" musí byť po dátume "od"', 'red'); return }
    const startsNow = membershipStart <= localDate(new Date())
    // ak nové kredity platia už teraz, staré aktívne (ktoré by sa prekrývali) deaktivujeme;
    // ak platia až od budúcna, necháme starú permanentku bežať ďalej (nová sa uplatní, keď stará skončí)
    if (startsNow) {
      await supabase.from('credits').update({ is_active: false })
        .eq('client_firebase_uid', selectedCreditClient.firebase_uid).eq('is_active', true)
    }
    const { error } = await supabase.from('credits').insert({
      client_firebase_uid: selectedCreditClient.firebase_uid,
      client_id: selectedCreditClient.id,
      amount: selectedMembership.credits,
      membership_type: selectedMembership.id,
      price_paid: selectedMembership.price,
      is_active: true,
      starts_at: membershipStart,
      expires_at: membershipEnd,
      trainer_firebase_uid: user.uid,
    })
    if (!error) {
      await supabase.from('credit_logs').insert({ client_firebase_uid: selectedCreditClient.firebase_uid, client_id: selectedCreditClient.id, change_amount: selectedMembership.credits, reason: `Nové členstvo: ${selectedMembership.label} (${membershipStart} – ${membershipEnd})` })
      showMsg(`Členstvo pridané pre ${selectedCreditClient.full_name} ✅`)
      selectCreditClient(selectedCreditClient)
    } else showMsg('Chyba: ' + error.message, 'red')
  }

  async function adjustCredits(delta) {
    if (!selectedCreditClient) { showMsg('Vyber klienta', 'red'); return }
    const { data: cr } = await supabase.from('credits').select('*').eq('client_firebase_uid', selectedCreditClient.firebase_uid).eq('is_active', true).lte('starts_at', localDate(new Date())).gte('expires_at', localDate(new Date())).order('expires_at').limit(1).maybeSingle()
    if (!cr) { showMsg('Klient nemá aktívne kredity', 'red'); return }
    const newAmount = Math.max(0, cr.amount + delta)
    await supabase.from('credits').update({ amount: newAmount }).eq('id', cr.id)
    await supabase.from('credit_logs').insert({ client_firebase_uid: selectedCreditClient.firebase_uid, client_id: selectedCreditClient.id, change_amount: delta, reason: `Manuálna úprava trénerom` })
    showMsg(`Kredity upravené: ${cr.amount} → ${newAmount}`)
    selectCreditClient(selectedCreditClient)
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

  const tabs = [
    { id: 'trainings', label: 'Tréningy' },
    { id: 'credits', label: 'Kredity' },
  ]

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '8px 20px', borderRadius: '999px', border: `1.5px solid ${activeTab === t.id ? 'var(--green)' : 'transparent'}`,
            background: activeTab === t.id ? 'var(--green-bg)' : 'none', color: activeTab === t.id ? 'var(--green-dark)' : 'var(--text-muted)',
            fontWeight: activeTab === t.id ? '600' : '400', fontSize: '13px', cursor: 'pointer'
          }}>{t.label}</button>
        ))}
      </div>

      {msg.text && (
        <div className={`info-box ${msg.type === 'red' ? 'info-red' : 'info-green'}`} style={{ marginBottom: '16px', fontWeight: '500' }}>
          {msg.text}
        </div>
      )}

      {/* ── TRAININGS TAB ── */}
      {activeTab === 'trainings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="display" style={{ margin: 0, fontSize: '24px' }}>Nadchádzajúce tréningy</h2>
          </div>

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

                      {/* Add client manually */}
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
      )}

      {/* ── CREDITS TAB ── */}
      {activeTab === 'credits' && (
        <div>
          <h2 className="display" style={{ margin: '0 0 16px', fontSize: '24px' }}>Správa kreditov</h2>

          {/* Client search */}
          <div style={s.card}>
            <label style={s.label}>Hľadaj klienta</label>
            <input
              style={s.input}
              placeholder="Meno, nick alebo email..."
              value={creditSearch}
              onChange={e => { setCreditSearch(e.target.value); searchCreditClients(e.target.value); setSelectedCreditClient(null); setClientCredits(null) }}
            />
            {creditSearchResults.length > 0 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', marginTop: '4px', overflow: 'hidden' }}>
                {creditSearchResults.map(c => (
                  <div key={c.id} onClick={() => selectCreditClient(c)} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '13px', background: 'white' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseOut={e => e.currentTarget.style.background = 'white'}>
                    <strong>{c.full_name}</strong> <span style={{ color: 'var(--text-muted)' }}>@{c.nickname} · {c.email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCreditClient && (
            <>
              {/* Client credits info */}
              <div className={`scoreboard-panel ${!clientCredits ? 'urgent' : ''}`} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: 'white' }}>{selectedCreditClient.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#ACA9A2' }}>@{selectedCreditClient.nickname} · {selectedCreditClient.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {clientCredits ? (
                      <>
                        <div className="num">{clientCredits.amount === 999 ? '∞' : clientCredits.amount}</div>
                        <div className="exp">platné do {new Date(clientCredits.expires_at).toLocaleDateString('sk-SK')}</div>
                      </>
                    ) : (
                      <span className="badge badge-red">Žiadne aktívne kredity</span>
                    )}
                  </div>
                </div>
                {clientCredits && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: '8px' }}>
                    <button onClick={() => adjustCredits(-1)} style={s.btnRed}>− 1 kredit</button>
                    <button onClick={() => adjustCredits(+1)} style={s.btn('white', 'rgba(255,255,255,0.12)')}>+ 1 kredit</button>
                    <button onClick={() => adjustCredits(+5)} style={s.btn('white', 'rgba(255,255,255,0.12)')}>+ 5 kreditov</button>
                  </div>
                )}
              </div>

              {/* Add membership */}
              <div style={s.card}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Pridať členstvo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {MEMBERSHIP_TYPES.map(mt => (
                    <button key={mt.id} onClick={() => setSelectedMembership(mt)} style={{
                      padding: '12px', borderRadius: '10px', border: `1.5px solid ${selectedMembership.id === mt.id ? 'var(--green)' : 'var(--border)'}`,
                      background: selectedMembership.id === mt.id ? 'var(--green-bg)' : 'white', cursor: 'pointer', textAlign: 'left'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: selectedMembership.id === mt.id ? 'var(--green-dark)' : 'var(--text)' }}>{mt.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{mt.price} €</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <div>
                    <label style={s.label}>Platí od</label>
                    <input type="date" style={s.input} value={membershipStart} onChange={e => setMembershipStart(e.target.value)} />
                  </div>
                  <div>
                    <label style={s.label}>Platí do</label>
                    <input type="date" style={s.input} value={membershipEnd} onChange={e => setMembershipEnd(e.target.value)} />
                  </div>
                </div>
                {membershipStart > localDate(new Date()) && (
                  <div className="info-box info-amber" style={{ marginBottom: '14px', fontSize: '12.5px' }}>
                    Platnosť začína až {new Date(membershipStart).toLocaleDateString('sk-SK')} — ak má klient ešte platné kredity, tie zostanú v platnosti do svojho konca a nové sa uplatnia až potom.
                  </div>
                )}
                <button onClick={addMembership} className="btn btn-green" style={{ width: '100%', padding: '10px' }}>
                  Pridať členstvo — {selectedMembership.label} ({selectedMembership.price} €)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

