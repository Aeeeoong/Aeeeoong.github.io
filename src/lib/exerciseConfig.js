/** @typedef {'kg' | 'level' | 'assist'} ExerciseUnit */
/** @typedef {'higher' | 'lower'} ExerciseBetter */

export const DEFAULT_EXERCISE_PROFILES = {
  '어시스트 풀업': {
    unit: 'assist',
    better: 'lower',
    useE1RM: false,
    inputLabel: '보조',
    suffix: 'kg',
  },
  '어시스트 딥': {
    unit: 'assist',
    better: 'lower',
    useE1RM: false,
    inputLabel: '보조',
    suffix: 'kg',
  },
  '플라이': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '레그컬': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '레그익스텐션': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '레그프레스': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '어브덕션': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '어덕션': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
  '케이블 푸시다운': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
  },
}

const FALLBACK_PROFILE = {
  unit: 'kg',
  better: 'higher',
  useE1RM: true,
  inputLabel: '무게',
  suffix: 'kg',
}

export function getExerciseProfile(name, settings) {
  const base = DEFAULT_EXERCISE_PROFILES[name] || FALLBACK_PROFILE
  const custom = settings?.exerciseProfiles?.[name]
  return custom ? { ...base, ...custom } : { ...base }
}

export function formatExerciseValue(value, profile) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const n = Number(value)
  const formatted = profile.unit === 'level' ? String(n) : n.toFixed(1).replace(/\.0$/, '')
  if (profile.suffix) return `${formatted}${profile.suffix}`
  return formatted
}

export function valueUnitForCompare(profile) {
  if (profile.unit === 'level') return ''
  return profile.suffix || 'kg'
}

export function improvementDelta(current, previous, profile) {
  if (current == null || previous == null) return null
  const cur = Number(current)
  const prev = Number(previous)
  if (profile.better === 'lower') return prev - cur
  return cur - prev
}

export function isPersonalBestValue(current, bestValue, profile) {
  if (current == null || bestValue == null) return false
  const cur = Number(current)
  const best = Number(bestValue)
  if (profile.better === 'lower') return cur < best
  return cur > best
}

export function personalBestLabel(profile) {
  return profile.better === 'lower' ? '역대 최저' : '역대 최고'
}
