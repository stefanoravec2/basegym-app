import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDh-FAIvJv63TJpTvwyFCLqPlniS_I1Tdg",
  authDomain: "basegym-app.firebaseapp.com",
  projectId: "basegym-app",
  storageBucket: "basegym-app.firebasestorage.app",
  messagingSenderId: "1041722587707",
  appId: "1:1041722587707:web:b99efc5f31161de2f4fa1e"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
