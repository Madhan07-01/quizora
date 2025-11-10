import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, getIdToken } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export async function signupWithEmail({ email, password, name, role = 'user' }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (name) await updateProfile(cred.user, { displayName: name })
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    name: name || cred.user.displayName || '',
    email: cred.user.email,
    role,
    createdAt: serverTimestamp(),
  }, { merge: true })
  return cred.user
}

export async function loginWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function logout() {
  await signOut(auth)
}

export async function currentIdToken(forceRefresh = false) {
  const user = auth.currentUser
  if (!user) return null
  return getIdToken(user, forceRefresh)
}
