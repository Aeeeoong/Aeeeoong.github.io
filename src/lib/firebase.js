import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDOw-42MCpUu9JWvbcRY4X-0Y6mp67oE_0',
  authDomain: 'workout-tracker-ec237.firebaseapp.com',
  projectId: 'workout-tracker-ec237',
  storageBucket: 'workout-tracker-ec237.firebasestorage.app',
  messagingSenderId: '45881955462',
  appId: '1:45881955462:web:dcd4859031f50a21aded07',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

export async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}
