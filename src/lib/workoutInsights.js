import { formatDate } from './utils'

/** 저장/폼 공통 — 운동 하나에서 비교용 지표 추출 */
export function getExerciseMetrics(exercise) {
  if (!exercise) return null

  if (exercise.mode === 'detailed' && exercise.setsDetail?.length) {
    const validSets = exercise.setsDetail.filter((s) => s.weight != null || s.reps != null)
    if (validSets.length === 0) return null

    const maxWeight = Math.max(...validSets.map((s) => Number(s.weight) || 0))
    const maxSet = validSets.reduce(
      (best, s) => ((Number(s.weight) || 0) >= (Number(best.weight) || 0) ? s : best),
      validSets[0],
    )
    const totalReps = validSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0)

    return {
      maxWeight: maxWeight > 0 ? maxWeight : null,
      reps: maxSet.reps != null ? Number(maxSet.reps) : null,
      sets: validSets.length,
      totalReps: totalReps > 0 ? totalReps : null,
    }
  }

  const weight = exercise.weight != null ? Number(exercise.weight) : null
  const reps = exercise.reps != null ? Number(exercise.reps) : null
  const sets = exercise.sets != null ? Number(exercise.sets) : null
  const totalReps = reps != null && sets != null ? reps * sets : reps

  if (weight == null && reps == null && sets == null) return null

  return {
    maxWeight: weight,
    reps,
    sets,
    totalReps: totalReps ?? null,
  }
}

export function isExerciseFilled(exercise) {
  if (exercise.comment?.trim()) return true
  if (exercise.mode === 'simple') {
    return exercise.weight != null || exercise.sets != null || exercise.reps != null
  }
  return (exercise.setsDetail || []).some((s) => s.weight != null || s.reps != null)
}

export function getCompletionRate(exercises) {
  if (!exercises?.length) return { filled: 0, total: 0, label: '0/0' }
  const filled = exercises.filter(isExerciseFilled).length
  return {
    filled,
    total: exercises.length,
    label: `${filled}/${exercises.length}`,
    percent: Math.round((filled / exercises.length) * 100),
  }
}

function formatDelta(diff, unit, decimals = 0) {
  if (diff === 0) return { text: '변화 없음', tone: 'neutral' }
  const sign = diff > 0 ? '+' : ''
  const value = decimals > 0 ? diff.toFixed(decimals) : String(diff)
  return {
    text: `${sign}${value}${unit}`,
    tone: diff > 0 ? 'up' : 'down',
  }
}

/** 현재 입력 vs 지난 기록 비교 */
export function compareWithPrevious(currentExercise, previousExercise) {
  const cur = getExerciseMetrics(currentExercise)
  const prev = getExerciseMetrics(previousExercise)
  if (!cur || !prev) return null

  const parts = []
  if (cur.maxWeight != null && prev.maxWeight != null) {
    parts.push({ key: 'weight', label: '무게', ...formatDelta(cur.maxWeight - prev.maxWeight, 'kg', 1) })
  }
  if (cur.reps != null && prev.reps != null) {
    parts.push({ key: 'reps', label: '회', ...formatDelta(cur.reps - prev.reps, '회') })
  }
  if (cur.sets != null && prev.sets != null) {
    parts.push({ key: 'sets', label: '세트', ...formatDelta(cur.sets - prev.sets, '세트') })
  }
  return parts.length ? parts : null
}

export function findPreviousExercise(workouts, type, exerciseName) {
  for (const workout of workouts) {
    if (workout.type !== type) continue
    const exercise = workout.exercises?.find((e) => e.name === exerciseName)
    if (exercise && getExerciseMetrics(exercise)) {
      return { workout, exercise }
    }
  }
  return null
}

export function getLastWorkoutByType(workouts, type) {
  return workouts.find((w) => w.type === type) || null
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() + days)
  return formatDate(d)
}

function getMondayOfWeek(refDate = new Date()) {
  const d = new Date(refDate)
  const day = d.getDay()
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return formatDate(d)
}

/** 운동 연속일 (오늘 또는 어제부터 거슬러 올라감) */
export function calculateStreak(workouts) {
  const dates = [...new Set(workouts.map((w) => w.date))].sort((a, b) => b.localeCompare(a))
  if (dates.length === 0) return { current: 0, message: '아직 기록이 없어요' }

  const today = formatDate(new Date())
  const yesterday = addDays(today, -1)

  let startDate = null
  if (dates.includes(today)) startDate = today
  else if (dates.includes(yesterday)) startDate = yesterday

  let current = 0
  if (startDate) {
    let cursor = startDate
    while (dates.includes(cursor)) {
      current++
      cursor = addDays(cursor, -1)
    }
  }

  let longest = 0
  let run = 0
  const asc = [...dates].sort((a, b) => a.localeCompare(b))
  for (let i = 0; i < asc.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = addDays(asc[i], -1)
      run = asc[i - 1] === prev ? run + 1 : 1
    }
    longest = Math.max(longest, run)
  }

  let message = ''
  if (current === 0) message = '오늘 운동하면 스트릭 시작!'
  else if (current === 1) message = '🔥 1일 연속 운동 중'
  else message = `🔥 ${current}일 연속 운동 중`

  return { current, longest, message }
}

/** 뉴비 친화 주간 요약 */
export function getWeeklySummary(workouts, inbodyRecords = []) {
  const weekStart = getMondayOfWeek(new Date())
  const weekEnd = addDays(weekStart, 6)
  const lastWeekStart = addDays(weekStart, -7)
  const lastWeekEnd = addDays(weekStart, -1)

  const thisWeek = workouts.filter((w) => w.date >= weekStart && w.date <= weekEnd)
  const lastWeek = workouts.filter((w) => w.date >= lastWeekStart && w.date <= lastWeekEnd)

  const workoutCount = thisWeek.length
  const lastCount = lastWeek.length
  const countDiff = workoutCount - lastCount

  let countMessage = `이번 주 ${workoutCount}번 운동`
  if (lastCount > 0) {
    if (countDiff > 0) countMessage += ` (지난주 ${lastCount}번 → +${countDiff}번!)`
    else if (countDiff < 0) countMessage += ` (지난주 ${lastCount}번)`
    else countMessage += ` (지난주와 같아요)`
  } else if (workoutCount > 0) {
    countMessage += ' — 좋은 시작이에요!'
  }

  let busiestLine = null
  if (thisWeek.length > 0) {
    const best = [...thisWeek].sort(
      (a, b) => (b.exercises?.length || 0) - (a.exercises?.length || 0),
    )[0]
    const d = new Date(`${best.date}T12:00:00`)
    busiestLine = `가장 알차게 한 날: ${d.getMonth() + 1}/${d.getDate()} · ${best.type}`
  }

  const improvement = findWeeklyImprovement(thisWeek, lastWeek)
  const weightLine = getWeeklyWeightLine(inbodyRecords, weekStart, lastWeekStart)

  const lines = [countMessage]
  if (busiestLine) lines.push(busiestLine)
  if (improvement) lines.push(improvement)
  if (weightLine) lines.push(weightLine)

  return {
    weekStart,
    weekEnd,
    workoutCount,
    countDiff,
    lines,
    encouragement:
      workoutCount >= 3
        ? '이번 주 정말 잘하고 있어요!'
        : workoutCount >= 1
          ? '조금씩 꾸준히 — 다음 운동도 화이팅!'
          : '이번 주 첫 운동을 기록해보세요',
  }
}

function findWeeklyImprovement(thisWeek, lastWeek) {
  const thisBest = {}
  const lastBest = {}

  for (const w of thisWeek) {
    for (const ex of w.exercises || []) {
      const m = getExerciseMetrics(ex)
      if (!m?.maxWeight) continue
      if (!thisBest[ex.name] || m.maxWeight > thisBest[ex.name]) {
        thisBest[ex.name] = m.maxWeight
      }
    }
  }

  for (const w of lastWeek) {
    for (const ex of w.exercises || []) {
      const m = getExerciseMetrics(ex)
      if (!m?.maxWeight) continue
      if (!lastBest[ex.name] || m.maxWeight > lastBest[ex.name]) {
        lastBest[ex.name] = m.maxWeight
      }
    }
  }

  let bestName = null
  let bestDiff = 0
  for (const [name, weight] of Object.entries(thisBest)) {
    const prev = lastBest[name]
    if (prev == null) continue
    const diff = weight - prev
    if (diff > bestDiff) {
      bestDiff = diff
      bestName = name
    }
  }

  if (bestName && bestDiff > 0) {
    return `${bestName}: ${lastBest[bestName]}kg → ${thisBest[bestName]}kg (+${bestDiff.toFixed(1)}kg)`
  }

  const firstNew = Object.keys(thisBest).find((name) => lastBest[name] == null)
  if (firstNew) {
    return `${firstNew} 이번 주 최고 ${thisBest[firstNew]}kg — 첫 기록이에요!`
  }

  return null
}

function getWeeklyWeightLine(inbodyRecords, weekStart, lastWeekStart) {
  if (!inbodyRecords.length) return null

  const thisWeekRecords = inbodyRecords.filter((r) => r.date >= weekStart)
  const lastWeekRecords = inbodyRecords.filter(
    (r) => r.date >= addDays(lastWeekStart, 0) && r.date < weekStart,
  )

  const latest = thisWeekRecords[0] || inbodyRecords[0]
  const prev = lastWeekRecords[0] || inbodyRecords[1]
  if (!latest?.weight) return null

  let line = `체중 ${Number(latest.weight).toFixed(1)}kg`
  if (prev?.weight) {
    const diff = Number(latest.weight) - Number(prev.weight)
    if (Math.abs(diff) >= 0.1) {
      const sign = diff > 0 ? '+' : ''
      line += ` (지난주 ${sign}${diff.toFixed(1)}kg)`
    }
  }
  return line
}

/** 운동별 역대 최고 */
export function getPersonalBests(workouts) {
  const bests = {}

  for (const workout of workouts) {
    for (const ex of workout.exercises || []) {
      const m = getExerciseMetrics(ex)
      if (!m) continue
      const name = ex.name
      if (!bests[name]) {
        bests[name] = {
          maxWeight: 0,
          maxTotalReps: 0,
          maxWeightDate: null,
          sessions: 0,
        }
      }
      bests[name].sessions++
      if (m.maxWeight && m.maxWeight > bests[name].maxWeight) {
        bests[name].maxWeight = m.maxWeight
        bests[name].maxWeightDate = workout.date
      }
      if (m.totalReps && m.totalReps > bests[name].maxTotalReps) {
        bests[name].maxTotalReps = m.totalReps
      }
    }
  }

  return bests
}

export function checkPersonalBest(exerciseName, currentExercise, bests) {
  const cur = getExerciseMetrics(currentExercise)
  if (!cur?.maxWeight) return null

  const best = bests[exerciseName]
  if (!best || cur.maxWeight <= best.maxWeight) return null

  return {
    previous: best.maxWeight,
    current: cur.maxWeight,
    diff: cur.maxWeight - best.maxWeight,
  }
}

export function getWorkoutDateSet(workouts) {
  return new Set(workouts.map((w) => w.date))
}

/** 통계용 — 선택 운동 요약 (뉴비 친화) */
export function getExerciseSummary(progress, exerciseName, bests) {
  if (!progress.length) return null

  const weights = progress.map((p) => p.weight).filter((w) => w != null && w > 0)
  const maxWeight = weights.length ? Math.max(...weights) : null
  const totalSessions = progress.length
  const totalReps = progress.reduce((sum, p) => {
    if (p.mode === 'detailed' && p.setsDetail?.length) {
      return sum + p.setsDetail.reduce((s, set) => s + (Number(set.reps) || 0), 0)
    }
    return sum + (Number(p.reps) || 0) * (Number(p.sets) || 1)
  }, 0)

  const best = bests[exerciseName]

  return {
    maxWeight,
    totalSessions,
    totalReps,
    allTimeBest: best?.maxWeight || maxWeight,
    bestDate: best?.maxWeightDate,
  }
}

export function formatWeekRangeLabel(weekStart, weekEnd) {
  const s = new Date(`${weekStart}T12:00:00`)
  const e = new Date(`${weekEnd}T12:00:00`)
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`
}
