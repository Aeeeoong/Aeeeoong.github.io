/** @typedef {'kg' | 'level' | 'assist' | 'none' | 'cardio'} ExerciseUnit */
/** @typedef {'higher' | 'lower'} ExerciseBetter */

const CARDIO_FIELD_DEFS = {
  incline: { label: '경사', suffix: '%', step: 0.5, precision: 1, min: 0, max: 30 },
  speed: { label: '속도', suffix: 'km/h', step: 0.1, precision: 1, min: 0 },
  minutes: { label: '시간', suffix: '분', step: 1, precision: 0, min: 1, max: 180 },
}

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
  '복근': {
    unit: 'none',
    better: 'higher',
    useE1RM: false,
    inputLabel: '회',
    suffix: '',
  },
  '천국의 계단': {
    unit: 'cardio',
    better: 'higher',
    useE1RM: false,
    cardioFields: ['speed', 'minutes'],
  },
  '런닝머신 (평지)': {
    unit: 'cardio',
    better: 'higher',
    useE1RM: false,
    cardioFields: ['speed', 'minutes'],
    inclineFixed: 0,
  },
  '런닝머신 (경사)': {
    unit: 'cardio',
    better: 'higher',
    useE1RM: false,
    cardioFields: ['incline', 'speed', 'minutes'],
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

export const PROFILE_UNIT_OPTIONS = [
  { value: 'kg', label: '무게 (kg)' },
  { value: 'level', label: '레벨 (기구)' },
  { value: 'assist', label: '보조 (kg, 낮을수록 좋음)' },
  { value: 'cardio', label: '유산소 (속도·시간)' },
  { value: 'none', label: '횟수만 (PR 없음)' },
]

export const PROFILE_UNIT_TEMPLATES = {
  kg: FALLBACK_PROFILE,
  level: DEFAULT_EXERCISE_PROFILES['플라이'],
  assist: DEFAULT_EXERCISE_PROFILES['어시스트 풀업'],
  cardio: DEFAULT_EXERCISE_PROFILES['런닝머신 (평지)'],
  none: DEFAULT_EXERCISE_PROFILES['복근'],
}

export function getProfileUnitKey(profile) {
  if (!profile) return 'kg'
  return profile.unit || 'kg'
}

export function buildExerciseProfile(unitKey) {
  const base = PROFILE_UNIT_TEMPLATES[unitKey] || FALLBACK_PROFILE
  return { ...base }
}

export function getExerciseProfile(name, settings) {
  const base = DEFAULT_EXERCISE_PROFILES[name] || FALLBACK_PROFILE
  const custom = settings?.exerciseProfiles?.[name]
  return custom ? { ...base, ...custom } : { ...base }
}

export function isCardioProfile(profile) {
  return profile?.unit === 'cardio'
}

export function getCardioFieldDefs(profile) {
  return (profile?.cardioFields || []).map((key) => ({
    key,
    ...CARDIO_FIELD_DEFS[key],
  }))
}

export function emptyCardioForProfile(profile) {
  const cardio = {}
  for (const { key } of getCardioFieldDefs(profile)) {
    if (key === 'incline' && profile.inclineFixed != null) {
      cardio.incline = profile.inclineFixed
    } else {
      cardio[key] = null
    }
  }
  return cardio
}

export function normalizeCardioForSave(cardio, profile) {
  const out = {}
  if (!cardio) return out
  for (const { key } of getCardioFieldDefs(profile)) {
    if (cardio[key] != null && cardio[key] !== '') {
      out[key] = Number(cardio[key])
    }
  }
  if (profile.inclineFixed != null) {
    out.incline = profile.inclineFixed
  }
  return out
}

export function formatCardioSummary(cardio, profile) {
  if (!cardio || !profile) return '-'
  const parts = []
  for (const { key, suffix } of getCardioFieldDefs(profile)) {
    const v = cardio[key]
    if (v == null || v === '') continue
    if (key === 'incline' && profile.inclineFixed != null) continue
    const formatted = key === 'speed' ? `${v}${suffix}` : `${v}${suffix}`
    parts.push(formatted)
  }
  if (profile.inclineFixed != null && cardio.incline != null && !parts.some((p) => p.includes('%'))) {
    // flat treadmill — incline 0 stored but not shown in fields
  }
  return parts.length ? parts.join(' · ') : '-'
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
  if (profile?.unit === 'none') return ''
  if (profile?.unit === 'cardio') return '최장 시간'
  return profile.better === 'lower' ? '역대 최저' : '역대 최고'
}

/** 기구별 최고 기록 카드 표시 대상 (복근 등 none 제외) */
export function tracksPersonalBest(profile) {
  return profile?.unit !== 'none'
}

export function formatPersonalBestValue(value, profile) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  if (isCardioProfile(profile)) return `${Number(value)}분`
  return formatExerciseValue(value, profile)
}

export function usesIntegerValue(profile) {
  return profile?.unit === 'level' || profile?.unit === 'assist'
}

export function statisticValueSuffix(profile) {
  if (!profile) return 'kg'
  if (profile.unit === 'level') return '레벨'
  if (profile.unit === 'assist') return '보조'
  if (profile.unit === 'cardio') return '분'
  return profile.suffix || 'kg'
}

/** 차트·축 라벨 */
export function chartValueLabel(exerciseName, profile) {
  if (!exerciseName) return '기록'
  if (isCardioProfile(profile)) return `${exerciseName} 시간 (분)`
  if (!profile) return `${exerciseName} 무게 (kg)`
  if (profile.unit === 'kg') {
    return `${exerciseName} ${profile.inputLabel} (${profile.suffix || 'kg'})`
  }
  return `${exerciseName} ${profile.inputLabel}`
}

export function inputNumberPropsForProfile(profile) {
  return {
    step: profile.step ?? (profile.unit === 'level' || profile.unit === 'assist' ? 1 : 0.5),
    precision: profile.precision ?? (profile.unit === 'level' || profile.unit === 'assist' ? 0 : 1),
    min: profile.min,
    max: profile.max,
  }
}

/** 입력란 아래 짧은 안내 (덤벨·단위 등) */
export function getExerciseInputHint(name, profile) {
  if (!name || !profile) return null
  if (profile.unit === 'cardio') return '속도·시간·경사를 입력하세요'
  if (profile.unit === 'level') return '기구 레벨 숫자 — 높을수록 좋아요'
  if (profile.unit === 'assist') return '보조 kg — 숫자가 낮을수록 좋아요'
  if (profile.unit === 'none') return '횟수만 기록하면 됩니다'
  if (name.includes('덤벨')) return '한 손당 kg 기준 (10kg 덤벨 = 10 입력)'
  if (profile.unit === 'kg') return '무게는 kg 단위입니다'
  return null
}
