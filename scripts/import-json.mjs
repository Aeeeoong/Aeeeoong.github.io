/**
 * Usage: node scripts/import-json.mjs <username> [jsonPath]
 * Example: node scripts/import-json.mjs 보섭 "C:/Users/던던가족/Downloads/workout-data-import.json"
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
  collection,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDOw-42MCpUu9JWvbcRY4X-0Y6mp67oE_0',
  authDomain: 'workout-tracker-ec237.firebaseapp.com',
  projectId: 'workout-tracker-ec237',
  storageBucket: 'workout-tracker-ec237.firebasestorage.app',
  messagingSenderId: '45881955462',
  appId: '1:45881955462:web:dcd4859031f50a21aded07',
}

const username = process.argv[2]
const jsonPath =
  process.argv[3] ||
  new URL('../../Downloads/workout-data-import.json', import.meta.url).pathname

if (!username) {
  console.error('사용법: node scripts/import-json.mjs <사용자이름> [json경로]')
  process.exit(1)
}

const raw = readFileSync(jsonPath, 'utf8')
const data = JSON.parse(raw)

console.log(`사용자: ${username}`)
console.log(
  `가져올 데이터 — 운동 ${data.workouts?.length ?? 0}개, 인바디 ${data.inbody?.length ?? 0}개, 설정 ${data.settings ? '있음' : '없음'}`,
)

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

await signInAnonymously(auth)
console.log('Firebase 익명 인증 OK')

await setDoc(
  doc(db, 'users', username),
  { username, updatedAt: new Date().toISOString() },
  { merge: true },
)

const items = []
for (const workout of data.workouts || []) {
  items.push({
    ref: doc(collection(db, 'users', username, 'workouts'), String(workout.id)),
    data: workout,
  })
}
for (const row of data.inbody || []) {
  const normalized = { ...row, muscleMass: row.muscleMass ?? row.muscle }
  items.push({
    ref: doc(collection(db, 'users', username, 'inbody'), String(row.id)),
    data: normalized,
  })
}

const batchSize = 400
for (let i = 0; i < items.length; i += batchSize) {
  const batch = writeBatch(db)
  items.slice(i, i + batchSize).forEach(({ ref, data: d }) => batch.set(ref, d))
  await batch.commit()
  console.log(`배치 저장: ${Math.min(i + batchSize, items.length)} / ${items.length}`)
}

if (data.settings) {
  await setDoc(doc(db, 'users', username, 'settings', 'config'), data.settings)
  console.log('설정 저장 OK')
}

console.log('완료. 앱에서 같은 사용자 이름으로 로그인하면 보입니다.')
process.exit(0)
