/** @typedef {'kg' | 'level' | 'assist'} ExerciseUnit */
/** @typedef {'higher' | 'lower'} ExerciseBetter */

/** 사용 중인 기구 기준 — 특이 케이스만 등록, 나머지는 kg */
export const DEFAULT_EXERCISE_PROFILES = {
  '플라이': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
    step: 1,
    precision: 0,
  },
  '레그컬': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
    step: 1,
    precision: 0,
  },
  'MTS rows': {
    unit: 'level',
    better: 'higher',
    useE1RM: false,
    inputLabel: '레벨',
    suffix: '',
    step: 1,
    precision: 0,
  },
  '어시스트 풀업': {
    unit: 'assist',
    better: 'lower',
    useE1RM: false,
    inputLabel: '보조',
    suffix: '',
    step: 1,
    precision: 0,
    min: 0,
    max: 90,
  },
}

const FALLBACK_PROFILE = {
  unit: 'kg',
  better: 'higher',
  useE1RM: true,
  inputLabel: '무게',
  suffix: 'kg',
  step: 0.5,
  precision: 1,
}

export function getExerciseProfile(name, settings) {
  const base = DEFAULT_EXERCISE_PROFILES[name] || FALLBACK_PROFILE
  const custom = settings?.exerciseProfiles?.[name]
  return custom ? { ...base, ...custom } : { ...base }
}

export function formatExerciseValue(value, profile) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const n = Number(value)
  const formatted =
    profile.unit === 'level' || profile.unit === 'assist'
      ? String(n)
      : n.toFixed(1).replace(/\.0$/, '')
  if (profile.suffix) return `${formatted}${profile.suffix}`
  return formatted
}

export function valueUnitForCompare(profile) {
  if (profile.unit === 'level' || profile.unit === 'assist') return ''
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

export function usesIntegerValue(profile) {
  return profile.unit === 'level' || profile.unit === 'assist'
}

export function statisticValueSuffix(profile) {
  if (profile.unit === 'level') return '레벨'
  if (profile.unit === 'assist') return '보조'
  return profile.suffix || 'kg'
}

export function inputNumberPropsForProfile(profile) {
  return {
    step: profile.step ?? (profile.unit === 'level' || profile.unit === 'assist' ? 1 : 0.5),
    precision: profile.precision ?? (profile.unit === 'level' || profile.unit === 'assist' ? 0 : 1),
    min: profile.min,
    max: profile.max,
  }
}
