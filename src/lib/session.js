import { supabase } from './supabase'

const SESSION_KEY = 'hc_lab_session'
const SESSION_TTL = 60 * 60 * 1000 // 60 min

export async function initSession() {
  // Resume if within TTL
  const stored = localStorage.getItem(SESSION_KEY)
  if (stored) {
    const { respondentId, timestamp, currentScreen, answers, product, lab } = JSON.parse(stored)
    if (Date.now() - timestamp < SESSION_TTL && respondentId) {
      return { respondentId, currentScreen, answers: answers || {}, product, lab, resumed: true }
    }
  }

  // Create new respondent
  const { data, error } = await supabase
    .from('hc_respondents')
    .insert({ language: 'cs', questionnaire_version: '1.0' })
    .select('id')
    .single()

  if (error) throw error

  const session = { respondentId: data.id, currentScreen: 'S00', answers: {}, product: null, lab: null }
  saveSessionLocal(session)
  await logEvent(data.id, 'survey_started', {})
  return session
}

export function saveSessionLocal(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, timestamp: Date.now() }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function saveAnswer(respondentId, questionId, value, meta = {}) {
  const payload = {
    respondent_id: respondentId,
    question_id: questionId,
    created_at: new Date().toISOString(),
    ...meta
  }

  if (typeof value === 'string') payload.answer_raw_text = value.trim()
  else if (typeof value === 'number') payload.answer_numeric = value
  else if (Array.isArray(value)) payload.answer_raw_text = JSON.stringify(value)
  else if (value && typeof value === 'object') {
    payload.answer_option_id = value.id || null
    payload.answer_raw_text = value.label || null
  }

  await supabase.from('hc_answers').insert(payload)
}

export async function updateRespondent(respondentId, fields) {
  await supabase.from('hc_respondents').update(fields).eq('id', respondentId)
}

export async function logEvent(respondentId, eventType, meta = {}) {
  await supabase.from('hc_events').insert({
    respondent_id: respondentId,
    event_type: eventType,
    questionnaire_version: '1.0',
    ...meta
  })
}

export async function assignLab(respondentId, product) {
  // Get quotas for this product
  const { data: quotas } = await supabase
    .from('hc_lab_quotas')
    .select('*')
    .eq('product', product)
    .eq('paused', false)

  if (!quotas || quotas.length === 0) return null

  // Filter available (not full)
  const available = quotas.filter(q => q.completed_count < q.quota)

  let chosen
  if (available.length === 0) {
    // OVERFLOW: pick lowest completed_count
    chosen = quotas.sort((a, b) => a.completed_count - b.completed_count)[0]
  } else {
    // Pick lowest ratio completed/quota (weighted by weight)
    chosen = available.sort((a, b) => {
      const ratioA = (a.completed_count / a.quota) / a.weight
      const ratioB = (b.completed_count / b.quota) / b.weight
      return ratioA - ratioB
    })[0]
  }

  await updateRespondent(respondentId, { assigned_lab: chosen.lab_id })
  await logEvent(respondentId, 'lab_assigned', { assigned_lab: chosen.lab_id, selected_product: product })

  return chosen.lab_id
}

export async function incrementLabCount(product, labId) {
  const { data } = await supabase
    .from('hc_lab_quotas')
    .select('completed_count')
    .eq('product', product)
    .eq('lab_id', labId)
    .single()

  if (data) {
    await supabase
      .from('hc_lab_quotas')
      .update({ completed_count: data.completed_count + 1 })
      .eq('product', product)
      .eq('lab_id', labId)
  }
}

export async function completeSession(respondentId, product, lab, startedAt) {
  const completedTime = Date.now() - startedAt
  const isSpeeder = completedTime < 45000

  await updateRespondent(respondentId, {
    completed: true,
    completed_at: new Date().toISOString(),
    completed_time_ms: completedTime,
    is_speeder: isSpeeder
  })

  await incrementLabCount(product, lab)
  await logEvent(respondentId, 'survey_completed', { selected_product: product, assigned_lab: lab })
  clearSession()
}

export async function saveEmailLead(respondentId, email) {
  await supabase.from('hc_email_leads').insert({
    respondent_id: respondentId,
    email: email.trim().toLowerCase(),
    discount_code: 'PRAHA20'
  })
  // Ecomail sync will happen here when LIST ID is configured
  const ECOMAIL_LIST_ID = import.meta.env.VITE_ECOMAIL_LIST_ID
  if (ECOMAIL_LIST_ID) {
    try {
      await fetch(`https://treningovyprogram.ecomailapp.cz/public/subscribe/${ECOMAIL_LIST_ID}/...`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email, discount_code: 'PRAHA20' })
      })
    } catch (e) { console.warn('Ecomail sync failed, stored locally', e) }
  }
}
