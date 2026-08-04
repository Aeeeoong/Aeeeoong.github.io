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
  writeBatch,
} from 'firebase/firestore'
import { db, ensureAnonymousAuth } from '../lib/firebase'
import { getDefaultData, getDefaultSettings, mergeSettingsWithDefaults } from '../lib/defaults'

const USER_KEY = 'currentUser'
const KNOWN_USERS_KEY = 'workout_tracker_known_users'
const LEGACY_KEY = 'workout_tracker_data'
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

export function addKnownUser(username) {
  if (!username) return
  const trimmed = username.trim()
  const users = getKnownUsers()
  if (users.includes(trimmed)) return
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify([...users, trimmed]))
}

function readLocalBundle(username) {
  const keys = [
    username ? `workout_tracker_data_${username}` : null,
    LEGACY_KEY,
  ].filter(Boolean)

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      return { key, data: JSON.parse(raw) }
    } catch {
      /* ignore */
    }
  }
  return null
}

async function ready(username) {
  requireUser(username)
  await ensureAnonymousAuth()
}

/**
 * Firebase를 유일한 저장소로 사용.
 * 로그인 시 클라우드가 비어 있고 로컬에 예전 데이터가 있으면 한 번만 업로드.
 */
export async function bootstrapUser(username) {
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
    return { migrated: false }
  }

  const local = readLocalBundle(username)
  if (!local?.data) {
    await setDoc(settingsRef(username), getDefaultSettings())
    localStorage.setItem(migratedFlag, 'true')
    return { migrated: false }
  }

  await importBundle(username, local.data)
  localStorage.setItem(migratedFlag, 'true')
  return { migrated: true, from: local.key }
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

export async function addWorkout(username, workout) {
  await ready(username)
  const newWorkout = {
    id: Date.now(),
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
  let q = workoutsCol(username)
  if (filters.type) {
    q = query(workoutsCol(username), where('type', '==', filters.type))
  }
  const snapshot = await getDocs(q)
  let workouts = snapshot.docs.map((d) => d.data())

  if (filters.startDate) {
    workouts = workouts.filter((w) => new Date(w.date) >= new Date(filters.startDate))
  }
  if (filters.endDate) {
    workouts = workouts.filter((w) => new Date(w.date) <= new Date(filters.endDate))
  }

  workouts.sort((a, b) => new Date(b.date) - new Date(a.date))
  return workouts
}

export async function addInbody(username, inbody) {
  await ready(username)
  const newInbody = {
    id: Date.now(),
    date: inbody.date,
    weight: parseFloat(inbody.weight),
    muscleMass: parseFloat(inbody.muscleMass ?? inbody.muscle),
    bodyFat: parseFloat(inbody.bodyFat),
    createdAt: new Date().toISOString(),
  }
  await setDoc(doc(inbodyCol(username), String(newInbody.id)), newInbody)
  return newInbody
}

export async function getInbodyRecords(username, limitCount = null) {
  await ready(username)
  const snapshot = await getDocs(query(inbodyCol(username), orderBy('date', 'desc')))
  let records = snapshot.docs.map((d) => {
    const data = d.data()
    return {
      ...data,
      muscleMass: data.muscleMass ?? data.muscle,
    }
  })
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

export { getDefaultData }
