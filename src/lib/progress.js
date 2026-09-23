// Spoločné výpočty pre "hravosť" klientského účtu.
// "Absolvovaný" tréning = aktívna rezervácia, ktorej termín už prešiel.
//
// Cieľ (koľko tréningov/týždeň) si klient nastavuje sám a môže ho kedykoľvek zmeniť.
// Aby bolo vyhodnotenie férové, každý týždeň sa posudzuje podľa cieľa, ktorý PRE NEHO
// platil vtedy — história cieľov (client_goal_history) sa preto nikdy neprepisuje,
// len sa pridávajú nové riadky s dátumom, odkedy platia.

export const DEFAULT_GOAL = 3

export function mondayOf(d) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}
function toKey(d) { return d.toISOString().split('T')[0] }

export function getAttendedDates(reservations) {
  const now = new Date()
  return (reservations || [])
    .filter(r => r.status === 'active' && r.trainings?.starts_at && new Date(r.trainings.starts_at) < now)
    .map(r => new Date(r.trainings.starts_at))
    .sort((a, b) => a - b)
}

// Aký cieľ platil k danému dátumu — najnovší záznam v histórii, ktorého effective_from
// už nastal. Ak história ešte neexistuje (týždne pred prvým nastavením cieľa), použije sa
// pôvodné predvolené číslo, nech sa staršie týždne vyhodnocujú rovnako, ako sa vyhodnocovali doteraz.
export function goalAt(goalHistory, date) {
  const applicable = (goalHistory || [])
    .filter(h => new Date(h.effective_from) <= date)
    .sort((a, b) => new Date(b.effective_from) - new Date(a.effective_from))
  return applicable[0]?.goal ?? DEFAULT_GOAL
}

export function computeStreak(dates, goalHistory) {
  if (!dates.length) return { current: 0, record: 0 }
  const counts = {}
  dates.forEach(d => { const k = toKey(mondayOf(d)); counts[k] = (counts[k] || 0) + 1 })

  const weeks = []
  let cursor = mondayOf(dates[0])
  const nowMonday = mondayOf(new Date())
  while (cursor <= nowMonday) {
    weeks.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }

  let record = 0, run = 0
  weeks.forEach(monday => {
    const met = (counts[toKey(monday)] || 0) >= goalAt(goalHistory, monday)
    if (met) { run += 1; record = Math.max(record, run) } else run = 0
  })

  let current = 0
  let i = weeks.length - 1
  const currentKey = toKey(nowMonday)
  // Prebiehajúci (ešte neskončený) týždeň, ktorý ešte nesplnil svoj vtedajší cieľ,
  // sa nepočíta ako zlyhaný — len sa preskočí, séria sa počíta od posledného dokončeného týždňa.
  if (i >= 0 && toKey(weeks[i]) === currentKey && (counts[currentKey] || 0) < goalAt(goalHistory, nowMonday)) {
    i -= 1
  }
  for (; i >= 0; i--) {
    const monday = weeks[i]
    if ((counts[toKey(monday)] || 0) >= goalAt(goalHistory, monday)) current += 1
    else break
  }
  return { current, record }
}

export function currentWeekProgress(dates, goalHistory) {
  const nowMonday = mondayOf(new Date())
  const count = dates.filter(d => mondayOf(d).getTime() === nowMonday.getTime()).length
  const goal = goalAt(goalHistory, nowMonday)
  return { count, goal, met: count >= goal }
}

export function computeBadges(dates, createdAt) {
  const total = dates.length
  const morningCount = dates.filter(d => d.getHours() === 6).length
  const weekendCount = dates.filter(d => d.getDay() === 0 || d.getDay() === 6).length
  const daysSinceJoin = createdAt ? Math.floor((new Date() - new Date(createdAt)) / 86400000) : 0
  return [
    { id: 'first_month', label: 'Prvý mesiac', icon: '🗓️', earned: daysSinceJoin >= 30 },
    { id: 'ten', label: '10 tréningov', icon: '🥉', earned: total >= 10 },
    { id: 'fifty', label: '50 tréningov', icon: '🥈', earned: total >= 50 },
    { id: 'early_bird', label: 'Ranné vtáča', icon: '🌅', earned: morningCount >= 10 },
    { id: 'weekend_warrior', label: 'Víkendový bojovník', icon: '⚔️', earned: weekendCount >= 10 },
  ]
}

const MONTHS_SK = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December']

export function computeMonthlyStats(dates) {
  const map = {}
  dates.forEach(d => {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map[key] = (map[key] || 0) + 1
  })
  return Object.entries(map)
    .map(([key, count]) => {
      const [y, m] = key.split('-')
      return { key, count, label: `${MONTHS_SK[parseInt(m) - 1]} ${y}` }
    })
    .sort((a, b) => b.key.localeCompare(a.key))
}

export function weekBuckets(dates, weeksBack = 28) {
  const now = new Date()
  const counts = {}
  dates.forEach(d => { const k = toKey(mondayOf(d)); counts[k] = (counts[k] || 0) + 1 })
  const buckets = []
  let cursor = mondayOf(now)
  for (let i = 0; i < weeksBack; i++) {
    const k = toKey(cursor)
    buckets.unshift({ key: k, count: counts[k] || 0 })
    cursor.setDate(cursor.getDate() - 7)
  }
  return buckets
}

export function heatLevel(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}
