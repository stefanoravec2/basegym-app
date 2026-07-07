import { createContext, useContext, useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, updateProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isTrainer, setIsTrainer] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const { data: trainerProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('firebase_uid', firebaseUser.uid)
          .maybeSingle()
        setIsTrainer(!!trainerProfile)
        await syncProfile(firebaseUser)
      } else {
        setUser(null)
        setProfile(null)
        setIsTrainer(false)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function syncProfile(firebaseUser) {
    const { data } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .maybeSingle()
    if (data) {
      setProfile(data)
    } else {
      const { data: existing } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('email', firebaseUser.email)
        .maybeSingle()
      if (existing) {
        await supabase.from('client_profiles').update({ firebase_uid: firebaseUser.uid }).eq('id', existing.id)
        setProfile({ ...existing, firebase_uid: firebaseUser.uid })
      } else {
        const { data: newProfile } = await supabase
          .from('client_profiles')
          .insert({ firebase_uid: firebaseUser.uid, full_name: firebaseUser.displayName || '', email: firebaseUser.email })
          .select().maybeSingle()
        setProfile(newProfile)
      }
    }
  }

  async function signUp(email, password, fullName, nickname, phone) {
    const uc = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(uc.user, { displayName: fullName })
    const { data: existing } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    if (existing) {
      await supabase.from('client_profiles').update({
        firebase_uid: uc.user.uid, full_name: fullName,
        nickname: nickname || fullName.split(' ')[0].toLowerCase(), phone: phone || null
      }).eq('id', existing.id)
    } else {
      await supabase.from('client_profiles').insert({
        firebase_uid: uc.user.uid, full_name: fullName, email,
        nickname: nickname || fullName.split(' ')[0].toLowerCase(), phone: phone || null
      })
    }
    return uc
  }

  async function signIn(email, password) { return signInWithEmailAndPassword(auth, email, password) }
  async function signOut() { await firebaseSignOut(auth) }

  return (
    <AuthContext.Provider value={{ user, profile, loading, isTrainer, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

