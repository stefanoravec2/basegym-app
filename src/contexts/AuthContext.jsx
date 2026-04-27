import { createContext, useContext, useEffect, useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, updateProfile } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        await syncProfile(firebaseUser)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function syncProfile(firebaseUser) {
    const { data, error } = await supabase
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
        await supabase
          .from('client_profiles')
          .update({ firebase_uid: firebaseUser.uid })
          .eq('id', existing.id)
        setProfile({ ...existing, firebase_uid: firebaseUser.uid })
      } else {
        const { data: newProfile } = await supabase
          .from('client_profiles')
          .insert({
            firebase_uid: firebaseUser.uid,
            full_name: firebaseUser.displayName || '',
            email: firebaseUser.email
          })
          .select()
          .maybeSingle()
        setProfile(newProfile)
      }
    }
  }

  async function signUp(email, password, fullName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(userCredential.user, { displayName: fullName })
    return userCredential
  }

  async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
