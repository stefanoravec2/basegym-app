import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [pass, setPass] = useState('')
  const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS || 'hellococo2026'

  if (!authed) return (
    <div style={{ maxWidth: 360, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--hc-purple)' }}>Admin</h1>
      <input type="password" className="hc-email-input" placeholder="Heslo" value={pass} onChange={e => setPass(e.target.value)} />
      <button className="hc-primary" style={{ marginTop: 12 }} onClick={() => { if (pass === ADMIN_PASS) setAuthed(true) }}>Přihlásit</button>
    </div>
  )

  return <AdminDashboard />
}

function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="hc-admin">
      <h1>hello coco · Customer Lab — Admin</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['overview', 'quotas', 'assets', 'responses', 'export'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 16px', borderRadius: 'var(--hc-radius-pill)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            background: tab === t ? 'var(--hc-purple)' : 'var(--hc-purple-soft)', color: tab === t ? 'white' : 'var(--hc-purple)'
          }}>
            {t === 'overview' ? 'Přehled' : t === 'quotas' ? 'Kvóty' : t === 'assets' ? 'Assety' : t === 'responses' ? 'Odpovědi' : 'Export'}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'quotas' && <Quotas />}
      {tab === 'assets' && <Assets />}
      {tab === 'responses' && <Responses />}
      {tab === 'export' && <Export />}
    </div>
  )
}

function Overview() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    Promise.all([
      supabase.from('hc_respondents').select('id, completed, selected_product, assigned_lab'),
      supabase.from('hc_email_leads').select('id')
    ]).then(([{ data: resp }, { data: leads }]) => {
      const all = resp || []
      setStats({
        started: all.length,
        completed: all.filter(r => r.completed).length,
        abandoned: all.filter(r => !r.completed).length,
        emails: (leads || []).length,
        byProduct: {
          NEEDRA: all.filter(r => r.selected_product === 'NEEDRA').length,
          CCT: all.filter(r => r.selected_product === 'CCT').length,
          PAP: all.filter(r => r.selected_product === 'PAP').length,
          TOOTHPASTE: all.filter(r => r.selected_product === 'TOOTHPASTE').length,
        }
      })
    })
  }, [])

  if (!stats) return <p style={{ color: 'var(--hc-muted)' }}>Načítáme…</p>
  return (
    <>
      <div className="hc-admin-card">
        <h2>Live přehled</h2>
        <div className="hc-stats-grid">
          {[
            ['Zahájeno', stats.started],
            ['Dokončeno', stats.completed],
            ['Nedokončeno', stats.abandoned],
            ['Emailů', stats.emails]
          ].map(([l, n]) => (
            <div key={l} className="hc-stat">
              <div className="hc-stat-num">{n}</div>
              <div className="hc-stat-label">{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="hc-admin-card">
        <h2>Výběr produktu</h2>
        <table className="hc-table">
          <thead><tr><th>Produkt</th><th>Respondentů</th></tr></thead>
          <tbody>
            {Object.entries(stats.byProduct).map(([p, n]) => (
              <tr key={p}><td>{p}</td><td><strong>{n}</strong></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Quotas() {
  const [quotas, setQuotas] = useState([])
  useEffect(() => {
    supabase.from('hc_lab_quotas').select('*').order('product').then(({ data }) => setQuotas(data || []))
  }, [])

  async function update(id, field, value) {
    await supabase.from('hc_lab_quotas').update({ [field]: value }).eq('id', id)
    setQuotas(q => q.map(x => x.id === id ? { ...x, [field]: value } : x))
  }

  const status = (q) => {
    if (q.paused) return <span className="hc-badge hc-badge-paused">Pozastaveno</span>
    if (q.completed_count >= q.quota) return <span className="hc-badge hc-badge-full">Naplněno</span>
    return <span className="hc-badge hc-badge-active">Aktivní</span>
  }

  return (
    <div className="hc-admin-card">
      <h2>Kvóty per produkt × lab</h2>
      <table className="hc-table">
        <thead><tr><th>Produkt</th><th>Lab</th><th>Stav</th><th>Splněno</th><th>Kvóta</th><th>Váha</th><th>Pauza</th></tr></thead>
        <tbody>
          {quotas.map(q => (
            <tr key={q.id}>
              <td><strong>{q.product}</strong></td>
              <td style={{ fontSize: 13 }}>{q.lab_id}</td>
              <td>{status(q)}</td>
              <td>{q.completed_count}</td>
              <td>
                <input className="hc-input-sm" type="number" defaultValue={q.quota}
                  onBlur={e => update(q.id, 'quota', parseInt(e.target.value))} />
              </td>
              <td>
                <input className="hc-input-sm" type="number" defaultValue={q.weight}
                  onBlur={e => update(q.id, 'weight', parseInt(e.target.value))} />
              </td>
              <td>
                <input type="checkbox" checked={q.paused} onChange={e => update(q.id, 'paused', e.target.checked)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Assets() {
  const [assets, setAssets] = useState([])
  useEffect(() => {
    supabase.from('hc_assets').select('*').order('id').then(({ data }) => setAssets(data || []))
  }, [])

  async function toggleActive(id, val) {
    await supabase.from('hc_assets').update({ active: val }).eq('id', id)
    setAssets(a => a.map(x => x.id === id ? { ...x, active: val } : x))
  }

  return (
    <div className="hc-admin-card">
      <h2>Asset Manager — Visual Lab sloty</h2>
      <p style={{ fontSize: 13, color: 'var(--hc-muted)', marginBottom: 16 }}>
        Assety označte jako aktivní až po nahrání souboru. Inactive experiment se respondentovi nezobrazí.
      </p>
      <table className="hc-table">
        <thead><tr><th>ID</th><th>Produkt</th><th>Typ</th><th>Aktivní</th></tr></thead>
        <tbody>
          {assets.map(a => (
            <tr key={a.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{a.id}</td>
              <td>{a.product}</td>
              <td style={{ fontSize: 13, color: 'var(--hc-muted)' }}>{a.variant_type}</td>
              <td>
                <input type="checkbox" checked={a.active} onChange={e => toggleActive(a.id, e.target.checked)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Responses() {
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState({ product: '', completed: '' })

  useEffect(() => {
    let q = supabase.from('hc_respondents').select('*').order('started_at', { ascending: false }).limit(200)
    supabase.from('hc_respondents').select('*').order('started_at', { ascending: false }).limit(200).then(({ data }) => setRows(data || []))
  }, [])

  const filtered = rows.filter(r => {
    if (filter.product && r.selected_product !== filter.product) return false
    if (filter.completed === 'yes' && !r.completed) return false
    if (filter.completed === 'no' && r.completed) return false
    return true
  })

  return (
    <div className="hc-admin-card">
      <h2>Respondenti</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select value={filter.product} onChange={e => setFilter(f => ({ ...f, product: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--hc-border)', fontFamily: 'inherit' }}>
          <option value="">Vše produkty</option>
          {['NEEDRA','CCT','PAP','TOOTHPASTE'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filter.completed} onChange={e => setFilter(f => ({ ...f, completed: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--hc-border)', fontFamily: 'inherit' }}>
          <option value="">Vše stavy</option>
          <option value="yes">Dokončeno</option>
          <option value="no">Nedokončeno</option>
        </select>
      </div>
      <p style={{ fontSize: 13, color: 'var(--hc-muted)', marginBottom: 12 }}>Zobrazeno {filtered.length} respondentů</p>
      <table className="hc-table">
        <thead><tr><th>ID</th><th>Zahájeno</th><th>Produkt</th><th>Lab</th><th>Stav</th><th>Věk</th><th>Pohlaví</th></tr></thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.id.slice(0,8)}…</td>
              <td style={{ fontSize: 12 }}>{new Date(r.started_at).toLocaleString('cs-CZ')}</td>
              <td>{r.selected_product || '—'}</td>
              <td style={{ fontSize: 12 }}>{r.assigned_lab || '—'}</td>
              <td>{r.completed ? <span className="hc-badge hc-badge-active">✓</span> : <span className="hc-badge hc-badge-paused">…</span>}</td>
              <td>{r.age_group || '—'}</td>
              <td>{r.gender || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Export() {
  async function exportCSV(table) {
    const { data } = await supabase.from(table).select('*')
    if (!data?.length) return
    const headers = Object.keys(data[0])
    const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${table}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  return (
    <div className="hc-admin-card">
      <h2>Export dat</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 300 }}>
        {[
          ['hc_respondents', 'Respondenti'],
          ['hc_answers', 'Odpovědi (raw)'],
          ['hc_exposures', 'Experiment exposures'],
          ['hc_email_leads', 'Emaily / slevy'],
          ['hc_events', 'Eventy']
        ].map(([table, label]) => (
          <button key={table} className="hc-btn-sm" style={{ textAlign: 'left', padding: '10px 16px' }} onClick={() => exportCSV(table)}>
            ↓ {label} (CSV)
          </button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: 'var(--hc-muted)', marginTop: 20 }}>
        Raw texty sú súčasťou tabuľky hc_answers v stĺpci answer_raw_text.
      </p>
    </div>
  )
}
