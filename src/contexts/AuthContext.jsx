import { createContext, useContext, useEffect, useState } from 'react'
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
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
    const { data } = await supabase
      .from('client_profiles')
      .select('*')
      .eq('firebase_uid', firebaseUser.uid)
      .single()
    
    if (data) {
      setProfile(data)
    } else {
      const { data: newProfile } = await supabase
        .from('client_profiles')
        .insert({
          firebase_uid: firebaseUser.uid,
          full_name: firebaseUser.displayName || '',
          email: firebaseUser.email
        })
        .select()
        .single()
      setProfile(newProfile)
    }
  }

  async function signUp(email, password, fullName) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(userCredential.user, { displayName: fullName })
    await supabase.from('client_profiles').insert({
      firebase_uid: userCredential.user.uid,
      full_name: fullName,
      email
    })
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
