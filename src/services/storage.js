import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../lib/firebase'
import { generateId } from '../lib/id'
import { generatePinSalt, hashPin, verifyPin } from '../lib/pinAuth'
import { getDefaultData, getDefaultSettings, mergeSettingsWithDefaults } from '../lib/defaults'

const USER_KEY = 'currentUser'
const KNOWN_USERS_KEY = 'workout_tracker_known_users'
const LEGACY_KEY = 'workout_tracker_data'
const LEGACY_MIGRATED_KEY = 'firebase_migrated_legacy_global'
const MIGRATED_PREFIX = 'firebase_migrated_v2_'

function userRef(username) {
  return doc(db, 'users', username)
}

function workoutsCol(username) {
  return collection(db, 'users', username, 'workouts')
}

function inbodyCol(username) {
  return collection(db, 'users', username, 'inbody')
}

function settingsRef(username) {
  return doc(db, 'users', username, 'settings', 'config')
}

function requireUser(username) {
  if (!username) throw new Error('로그인이 필요합니다.')
}

export function getCurrentUser() {
  return localStorage.getItem(USER_KEY)
}

export function setCurrentUser(username) {
  localStorage.setItem(USER_KEY, username)
}

export function clearCurrentUser() {
  localStorage.removeItem(USER_KEY)
}

/** 예전 바닐라 앱 localStorage 키에서 사용자 목록 추출 (로그인 배지용) */
export function getLocalRegisteredUsers() {
  const users = new Set()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('workout_tracker_data_')) {
      users.add(key.replace('workout_tracker_data_', ''))
    }
  }
  const current = getCurrentUser()
  if (current) users.add(current)
  return [...users]
}

/** 이 기기에서 로그인해 본 사용자 목록 (파트너 빠른 전환용) */
export function getKnownUsers() {
  const users = new Set(getLocalRegisteredUsers())
  try {
    const stored = JSON.parse(localStorage.getItem(KNOWN_USERS_KEY) || '[]')
    if (Array.isArray(stored)) stored.forEach((name) => users.add(name))
  } catch {
    /* ignore */
  }
  return [...users]
}

export function addKnownUser(username, previousUser = null) {
  if (!username) return
  const trimmed = username.trim()
  const users = new Set(getKnownUsers())
  users.add(trimmed)
  if (previousUser) users.add(previousUser.trim())
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify([...users]))
}

function readUserLocalBundle(username) {
  if (!username) return null
  const key = `workout_tracker_data_${username}`
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return { key, data: JSON.parse(raw) }
  } catch {
    return null
  }
}

function readLegacyBundle() {
  const raw = localStorage.getItem(LEGACY_KEY)
  if (!raw) return null
  try {
    return { key: LEGACY_KEY, data: JSON.parse(raw) }
  } catch {
    return null
  }
}

async function ready(username) {
  requireUser(username)
  await ensureAnonymousAuth()
}

async function authReady() {
  await ensureAnonymousAuth()
}

/**
 * Firebase를 유일한 저장소로 사용.
 * allowLegacyImport: true — 로그인 화면에서 처음 들어올 때만 (예전 localStorage 1회 이전)
 */
export async function bootstrapUser(username, { allowLegacyImport = false } = {}) {
  await ready(username)

  await setDoc(
    userRef(username),
    { username, updatedAt: new Date().toISOString() },
    { merge: true },
  )

  const migratedFlag = `${MIGRATED_PREFIX}${username}`
  if (localStorage.getItem(migratedFlag)) {
    return { migrated: false }
  }

  const [workoutsSnap, inbodySnap, settingsSnap] = await Promise.all([
    getDocs(workoutsCol(username)),
    getDocs(inbodyCol(username)),
    getDoc(settingsRef(username)),
  ])

  const cloudHasData =
    !workoutsSnap.empty || !inbodySnap.empty || settingsSnap.exists()

  if (cloudHasData) {
    localStorage.setItem(migratedFlag, 'true')
    if (!localStorage.getItem(LEGACY_MIGRATED_KEY)) {
      localStorage.setItem(LEGACY_MIGRATED_KEY, 'true')
    }
    return { migrated: false }
  }

  const userLocal = readUserLocalBundle(username)
  if (userLocal?.data) {
    await importBundle(username, userLocal.data)
    localStorage.setItem(migratedFlag, 'true')
    return { migrated: true, from: userLocal.key }
  }

  if (allowLegacyImport && !localStorage.getItem(LEGACY_MIGRATED_KEY)) {
    const legacy = readLegacyBundle()
    if (legacy?.data) {
      await importBundle(username, legacy.data)
      localStorage.setItem(migratedFlag, 'true')
      localStorage.setItem(LEGACY_MIGRATED_KEY, 'true')
      return { migrated: true, from: LEGACY_KEY }
    }
  }

  await setDoc(settingsRef(username), getDefaultSettings())
  localStorage.setItem(migratedFlag, 'true')
  return { migrated: false }
}

export async function getSettings(username) {
  await ready(username)
  const snap = await getDoc(settingsRef(username))
  if (!snap.exists()) {
    const defaults = getDefaultSettings()
    await setDoc(settingsRef(username), defaults)
    return defaults
  }
  const saved = snap.data()
  const merged = mergeSettingsWithDefaults(saved)
  const routineChanged =
    JSON.stringify(saved.routineOrder || []) !== JSON.stringify(merged.routineOrder)
  if (routineChanged) {
    await setDoc(settingsRef(username), merged)
  }
  return merged
}

export async function saveSettings(username, settings) {
  await ready(username)
  await setDoc(settingsRef(username), settings)
  return settings
}

export async function getUserMeta(username) {
  if (!username) throw new Error('사용자 이름이 필요합니다.')
  await authReady()
  const snap = await getDoc(userRef(username))
  return snap.exists() ? snap.data() : { username }
}

export async function userHasPin(username) {
  const meta = await getUserMeta(username)
  return !!(meta.pinHash && meta.pinSalt)
}

export async function verifyUserPin(username, pin) {
  if (!username) throw new Error('사용자 이름이 필요합니다.')
  await authReady()
  const meta = await getUserMeta(username)
  if (!meta.pinHash) return { ok: true, needsSetup: true }
  const ok = await verifyPin(pin, meta.pinSalt, meta.pinHash)
  return { ok, needsSetup: false }
}

export async function setUserPin(username, pin) {
  await ready(username)
  const salt = generatePinSalt()
  const pinHash = await hashPin(pin, salt)
  await setDoc(
    userRef(username),
    { username, pinSalt: salt, pinHash, pinUpdatedAt: new Date().toISOString() },
    { merge: true },
  )
  return true
}

export async function addWorkout(username, workout) {
  await ready(username)
  const newWorkout = {
    id: generateId(),
    date: workout.date,
    type: workout.type,
    exercises: workout.exercises,
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(workoutsCol(username), String(newWorkout.id)), newWorkout)
  return newWorkout
}

export async function updateWorkout(username, workout) {
  await ready(username)
  if (workout?.id == null) throw new Error('수정할 기록 ID가 없습니다.')
  const updated = {
    ...workout,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(workoutsCol(username), String(workout.id)), updated)
  return updated
}

export async function deleteWorkout(username, id) {
  await ready(username)
  await deleteDoc(doc(workoutsCol(username), String(id)))
  return true
}

export async function getWorkouts(username, filters = {}) {
  await ready(username)
  const col = workoutsCol(username)
  const hasExtraFilter = !!(filters.type || filters.startDate || filters.endDate)

  if (!hasExtraFilter && filters.limit) {
    const snapshot = await getDocs(query(col, orderBy('date', 'desc'), limit(filters.limit)))
    return snapshot.docs.map((d) => d.data())
  }

  const snapshot = await getDocs(query(col, orderBy('date', 'desc')))
  let workouts = snapshot.docs.map((d) => d.data())

  if (filters.type) workouts = workouts.filter((w) => w.type === filters.type)
  if (filters.startDate) workouts = workouts.filter((w) => w.date >= filters.startDate)
  if (filters.endDate) workouts = workouts.filter((w) => w.date <= filters.endDate)
  if (filters.limit) workouts = workouts.slice(0, filters.limit)

  return workouts
}

/** 홈·최근 목록용 */
export async function getRecentWorkouts(username, limitCount = 50) {
  return getWorkouts(username, { limit: limitCount })
}

/** 달력 월 범위 */
export async function getWorkoutsForMonth(username, year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return getWorkouts(username, { startDate: start, endDate: end })
}

export async function addInbody(username, inbody) {
  await ready(username)
  const newInbody = {
    id: generateId(),
    date: inbody.date,
    weight: parseFloat(inbody.weight),
    muscleMass: parseFloat(inbody.muscleMass ?? inbody.muscle),
    bodyFat: parseFloat(inbody.bodyFat),
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(inbodyCol(username), String(newInbody.id)), newInbody)
  return newInbody
}

export async function updateInbody(username, record) {
  await ready(username)
  if (record?.id == null) throw new Error('수정할 인바디 ID가 없습니다.')
  const updated = {
    ...record,
    muscleMass: parseFloat(record.muscleMass ?? record.muscle),
    weight: parseFloat(record.weight),
    bodyFat: parseFloat(record.bodyFat),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(doc(inbodyCol(username), String(record.id)), updated)
  return updated
}

export async function deleteInbody(username, id) {
  await ready(username)
  await deleteDoc(doc(inbodyCol(username), String(id)))
  return true
}

export async function getInbodyRecords(username, limitCount = null, filters = {}) {
  await ready(username)
  const snapshot = await getDocs(query(inbodyCol(username), orderBy('date', 'desc')))
  let records = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      muscleMass: data.muscleMass ?? data.muscle,
    }
  })
  if (filters.startDate) records = records.filter((r) => r.date >= filters.startDate)
  if (filters.endDate) records = records.filter((r) => r.date <= filters.endDate)
  return limitCount ? records.slice(0, limitCount) : records
}

export async function getLatestInbody(username) {
  const records = await getInbodyRecords(username, 1)
  return records[0] || null
}

export async function getExerciseProgress(username, exerciseName) {
  const workouts = await getWorkouts(username)
  const progress = []

  ;[...workouts]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((workout) => {
      const exercise = workout.exercises?.find((e) => e.name === exerciseName)
      if (!exercise) return

      if (exercise.mode === 'cardio' && exercise.cardio) {
        progress.push({
          date: workout.date,
          mode: 'cardio',
          cardio: exercise.cardio,
          minutes: exercise.cardio.minutes ? parseFloat(exercise.cardio.minutes) : null,
          comment: exercise.comment || '',
        })
        return
      }

      let weight
      let sets
      let reps

      if (exercise.mode === 'detailed' && exercise.setsDetail?.length) {
        const maxWeightSet = exercise.setsDetail.reduce(
          (max, set) => ((set.weight || 0) > (max.weight || 0) ? set : max),
          exercise.setsDetail[0],
        )
        weight = maxWeightSet.weight
        sets = exercise.setsDetail.length
        reps = maxWeightSet.reps
      } else {
        weight = exercise.weight
        sets = exercise.sets
        reps = exercise.reps
      }

      if (weight || sets || reps) {
        progress.push({
          date: workout.date,
          weight: weight ? parseFloat(weight) : null,
          sets: parseInt(sets, 10) || 0,
          reps: parseInt(reps, 10) || 0,
          comment: exercise.comment || '',
          mode: exercise.mode || 'simple',
          setsDetail: exercise.setsDetail || null,
        })
      }
    })

  return progress
}

export async function getWorkoutStats(username) {
  const workouts = await getWorkouts(username)
  const workoutsByType = {}
  workouts.forEach((w) => {
    workoutsByType[w.type] = (workoutsByType[w.type] || 0) + 1
  })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentWorkouts = workouts.filter((w) => new Date(w.date) >= sevenDaysAgo).length

  return {
    totalWorkouts: workouts.length,
    workoutsByType,
    recentWorkouts,
    lastWorkout: workouts[0] || null,
  }
}

export async function exportBundle(username) {
  const [workouts, inbody, settings] = await Promise.all([
    getWorkouts(username),
    getInbodyRecords(username),
    getSettings(username),
  ])
  return { workouts, inbody, settings }
}

export async function importBundle(username, imported) {
  await ready(username)
  const batchSize = 400
  const items = []

  if (imported.workouts?.length) {
    for (const workout of imported.workouts) {
      items.push({ ref: doc(workoutsCol(username), String(workout.id)), data: workout })
    }
  }
  if (imported.inbody?.length) {
    for (const row of imported.inbody) {
      const normalized = {
        ...row,
        muscleMass: row.muscleMass ?? row.muscle,
      }
      items.push({ ref: doc(inbodyCol(username), String(row.id)), data: normalized })
    }
  }

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(db)
    items.slice(i, i + batchSize).forEach(({ ref, data }) => batch.set(ref, data))
    await batch.commit()
  }

  if (imported.settings) {
    await setDoc(settingsRef(username), mergeSettingsWithDefaults(imported.settings))
  }

  return true
}

export async function resetSettings(username) {
  const defaults = getDefaultSettings()
  await saveSettings(username, defaults)
  return defaults
}

/** 운동·인바디·설정 전체 삭제 (잘못 이전된 데이터 정리용) */
export async function clearUserData(username) {
  await ready(username)
  const [workoutsSnap, inbodySnap] = await Promise.all([
    getDocs(workoutsCol(username)),
    getDocs(inbodyCol(username)),
  ])

  const refs = [
    ...workoutsSnap.docs.map((d) => d.ref),
    ...inbodySnap.docs.map((d) => d.ref),
  ]

  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db)
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }

  await setDoc(settingsRef(username), getDefaultSettings())
  return true
}

export async function getPartnerSummary(partnerUsername) {
  if (!partnerUsername) return null
  try {
    await ready(partnerUsername)
    const workouts = await getRecentWorkouts(partnerUsername, 30)
    const today = new Date()
    const day = today.getDay()
    const offset = day === 0 ? -6 : 1 - day
    const monday = new Date(today)
    monday.setDate(today.getDate() + offset)
    const weekStart = monday.toISOString().slice(0, 10)
    const weekCount = workouts.filter((w) => w.date >= weekStart).length
    const last = workouts[0] || null
    return {
      username: partnerUsername,
      weekCount,
      lastWorkout: last
        ? { date: last.date, type: last.type, exerciseCount: last.exercises?.length || 0 }
        : null,
      totalRecent: workouts.length,
    }
  } catch {
    return null
  }
}

export { getDefaultData }
