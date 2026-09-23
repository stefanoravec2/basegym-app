// Spoločné výpočty pre "hravosť" klientského účtu.
// "Absolvovaný" tréning = aktívna rezervácia, ktorej termín už prešiel (rovnaký princíp ako inde v appke).

const WEEKLY_GOAL = 3

export function getAttendedDates(reservations) {
  const now = new Date()
  return (reservations || [])
    .filter(r => r.status === 'active' && r.trainings?.starts_at && new Date(r.trainings.starts_at) < now)
    .map(r => new Date(r.trainings.starts_at))
    .sort((a, b) => a - b)
}

export function weekKeyOf(d) {
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7)
  return `${d.getFullYear()}-w${week}`
}

export function computeStreak(dates, goalPerWeek = WEEKLY_GOAL) {
  if (!dates.length) return { current: 0, record: 0 }
  const counts = {}
  dates.forEach(d => { const k = weekKeyOf(d); counts[k] = (counts[k] || 0) + 1 })

  const weeks = []
  let cursor = new Date(dates[0])
  const now = new Date()
  while (cursor <= now) {
    weeks.push(weekKeyOf(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  const uniqueWeeks = [...new Set(weeks)]

  let record = 0, run = 0
  uniqueWeeks.forEach(wk => {
    if ((counts[wk] || 0) >= goalPerWeek) { run += 1; record = Math.max(record, run) }
    else run = 0
  })

  let current = 0
  const currentWeekKey = weekKeyOf(now)
  let i = uniqueWeeks.length - 1
  // Prebiehajúci (ešte neskončený) týždeň, ktorý ešte nesplnil cieľ, sa nepočíta ako zlyhaný —
  // len sa preskočí a séria sa počíta od posledného DOKONČENÉHO týždňa.
  if (uniqueWeeks[i] === currentWeekKey && (counts[currentWeekKey] || 0) < goalPerWeek) {
    i -= 1
  }
  for (; i >= 0; i--) {
    if ((counts[uniqueWeeks[i]] || 0) >= goalPerWeek) current += 1
    else break
  }
  return { current, record }
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
  dates.forEach(d => { const k = weekKeyOf(d); counts[k] = (counts[k] || 0) + 1 })
  const buckets = []
  let cursor = new Date(now)
  for (let i = 0; i < weeksBack; i++) {
    const k = weekKeyOf(cursor)
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
