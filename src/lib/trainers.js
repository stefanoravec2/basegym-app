// Tréneri podľa ich Firebase prihlasovacieho ID.
// Keď sa zaregistruje ďalší tréner (Miška, Tina, Tisto...), stačí sem doplniť
// jeden riadok s jeho menom, emoji a Firebase ID (to nájdeš v Supabase, tabuľka
// client_profiles, podľa jeho emailu).
export const TRAINERS = {
  'p77NZzcFCaRBnlVE3MQ6KxFwvSz1': { name: 'Marcel', emoji: '🦈' },
}

export function trainerInfo(firebaseUid) {
  if (!firebaseUid) return null
  return TRAINERS[firebaseUid] || null
}
