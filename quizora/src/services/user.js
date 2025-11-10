import { doc, getDoc, setDoc, serverTimestamp, increment, getDocs, collection, query, orderBy, limit } from 'firebase/firestore'
import { updateProfile as fbUpdateProfile } from 'firebase/auth'
import { auth, db } from '../lib/firebase'

export async function getUserProfile(uid = auth.currentUser?.uid) {
  if (!uid) return null
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

// Recompute xp and badgesCount from awards subcollection and persist on user doc (non-destructive)
export async function recomputeStatsFromAwards(uid = auth.currentUser?.uid) {
  if (!uid) return
  const awardsRef = collection(db, 'users', uid, 'awards')
  const snap = await getDocs(awardsRef)
  let xpSum = 0
  snap.forEach(d => { xpSum += Number(d.data()?.xp ?? 0) })
  const badgesCount = snap.size
  const userRef = doc(db, 'users', uid)
  await setDoc(userRef, { xp: xpSum, badgesCount, updatedAt: serverTimestamp() }, { merge: true })
}

export async function ensureUserProfile({ name, email } = {}) {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    // First-time creation: set defaults
    await setDoc(ref, {
      uid: u.uid,
      name: name ?? u.displayName ?? '',
      email: email ?? u.email ?? '',
      xp: 0,
      quizzesPlayed: 0,
      quizzesCreated: 0,
      streakDays: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      badgesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true })
  } else {
    // Doc exists: never reset counters; only update provided name/email
    const update = {}
    if (typeof name !== 'undefined') update.name = name
    if (typeof email !== 'undefined') update.email = email
    if (Object.keys(update).length) {
      update.updatedAt = serverTimestamp()
      await setDoc(ref, update, { merge: true })
    }
  }
}

export async function updateUserProfile({ name, bio }) {
  const u = auth.currentUser
  if (!u) throw new Error('Not authenticated')
  if (name && name !== u.displayName) {
    await fbUpdateProfile(u, { displayName: name })
    try { await u.reload() } catch {}
  }
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, { name, bio, updatedAt: serverTimestamp() }, { merge: true })
}

// Example stat updaters to call after quiz flows
export async function addXp(amount = 10) {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, { xp: increment(amount), updatedAt: serverTimestamp() }, { merge: true })
}

export async function incPlayed() {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, { quizzesPlayed: increment(1), updatedAt: serverTimestamp() }, { merge: true })
}

export async function incCreated() {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, { quizzesCreated: increment(1), updatedAt: serverTimestamp() }, { merge: true })
}

export async function incStreak(days = 1) {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, { streakDays: increment(days), updatedAt: serverTimestamp() }, { merge: true })
}

export async function listTopUsers(top = 20) {
  const ref = collection(db, 'users')
  const q = query(ref, orderBy('xp', 'desc'), limit(top))
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data())
}

export async function recordQuizResult({ correct = 0, total = 0, xp = 10 } = {}) {
  const u = auth.currentUser
  if (!u) return
  const ref = doc(db, 'users', u.uid)
  await setDoc(ref, {
    quizzesPlayed: increment(1),
    xp: increment(xp),
    totalCorrect: increment(correct),
    totalQuestions: increment(total),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
