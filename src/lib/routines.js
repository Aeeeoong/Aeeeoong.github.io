export const FREE_ROUTINE_NAME = '자유'
const CARDIO_ROUTINE_NAME = '유산소'

export function isFreeRoutine(routineType) {
  return routineType === FREE_ROUTINE_NAME
}

/** 설정에 등록된 전체 기구 (자유 루틴 · 유산소 우선) */
export function getAllExerciseNames(settings, { exclude = [] } = {}) {
  if (!settings) return []
  const excludeSet = new Set(exclude)
  const seen = new Set()
  const names = []

  const push = (list) => {
    for (const name of list || []) {
      if (seen.has(name) || excludeSet.has(name)) continue
      seen.add(name)
      names.push(name)
    }
  }

  push(settings.exercises?.[CARDIO_ROUTINE_NAME])

  for (const routine of settings.routineOrder || []) {
    if (routine === FREE_ROUTINE_NAME || routine === CARDIO_ROUTINE_NAME) continue
    push(settings.exercises?.[routine])
  }

  return names
}

/** 운동 추가 모달용 — 자유: 전체 기구, 그 외: 해당 루틴만 */
export function getAddableExerciseNames(settings, routineType, currentNames = []) {
  const current = new Set(currentNames)
  if (isFreeRoutine(routineType)) {
    return getAllExerciseNames(settings, { exclude: currentNames })
  }
  return (settings?.exercises?.[routineType] || []).filter((n) => !current.has(n))
}

/** Select options — 자유 루틴은 유산소 그룹을 맨 위에 */
export function getAddableExerciseOptions(settings, routineType, currentNames = []) {
  const available = getAddableExerciseNames(settings, routineType, currentNames)
  if (!isFreeRoutine(routineType)) {
    return available.map((name) => ({ value: name, label: name }))
  }

  const cardioSet = new Set(settings?.exercises?.[CARDIO_ROUTINE_NAME] || [])
  const cardio = available.filter((n) => cardioSet.has(n))
  const rest = available.filter((n) => !cardioSet.has(n))
  const options = []

  if (cardio.length) {
    options.push({
      label: '유산소',
      options: cardio.map((name) => ({ value: name, label: name })),
    })
  }
  if (rest.length) {
    options.push({
      label: '근력·기타',
      options: rest.map((name) => ({ value: name, label: name })),
    })
  }
  return options
}

export function defaultAddableExercise(settings, routineType, currentNames = []) {
  const names = getAddableExerciseNames(settings, routineType, currentNames)
  return names[0] || null
}
