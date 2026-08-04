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

/** 주 3회 루틴 기준 (3분할) */
const WEEKLY_GOAL = 3

function pickDaily(messages, salt = '') {
  const today = formatDate(new Date())
  const hash = [...`${today}${salt}`].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return messages[hash % messages.length]
}

function daysBetween(fromDate, toDate) {
  const a = new Date(`${fromDate}T12:00:00`)
  const b = new Date(`${toDate}T12:00:00`)
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

/** 홈 배너 — 상황별·날마다 바뀌는 동기부여 문구 */
export function getMotivationBanner(workouts) {
  const streak = calculateStreak(workouts)
  const today = formatDate(new Date())
  const weekStart = getMondayOfWeek(new Date())
  const weekEnd = addDays(weekStart, 6)
  const thisWeek = workouts.filter((w) => w.date >= weekStart && w.date <= weekEnd)
  const weekCount = thisWeek.length
  const workedOutToday = workouts.some((w) => w.date === today)
  const lastWorkout = workouts[0]
  const daysSinceLast = lastWorkout ? daysBetween(lastWorkout.date, today) : null
  const weekProgress = `이번 주 ${weekCount}/${WEEKLY_GOAL}회`

  if (workouts.length === 0) {
    return {
      main: pickDaily([
        '첫 운동, 기록부터 시작해요 💪',
        '오늘 한 번이 시작이에요',
        '작은 기록이 큰 변화를 만들어요',
      ]),
      sub: '기록하면 동기부여가 쌓여요',
    }
  }

  if (workedOutToday && weekCount >= WEEKLY_GOAL) {
    return {
      main: pickDaily([
        '이번 주 목표 달성! 🎉',
        '완벽한 한 주예요, 정말 잘했어요',
        '3회 채웠어요 — 이번 주 MVP',
      ], 'goal'),
      sub: `${weekCount}번째 운동까지 마쳤어요`,
    }
  }

  if (workedOutToday) {
    return {
      main: pickDaily([
        '오늘도 수고했어요 👏',
        '한 번 더, 조금 더 강해졌어요',
        '기록 완료! 회복도 잘하세요',
        '오운완! 내일은 쉬어도 OK',
      ], 'done'),
      sub: weekCount < WEEKLY_GOAL ? `${weekProgress} · ${WEEKLY_GOAL - weekCount}번 남음` : weekProgress,
    }
  }

  if (daysSinceLast != null && daysSinceLast >= 5) {
    return {
      main: pickDaily([
        '다시 시작하기 딱 좋은 날이에요',
        '오랜만이에요! 가볍게부터 OK',
        '돌아온 걸 환영해요 💪',
      ], 'return'),
      sub: `${daysSinceLast}일 만의 기록을 기다리고 있어요`,
    }
  }

  if (weekCount === 0) {
    return {
      main: pickDaily([
        '이번 주 첫 운동, 화이팅!',
        '새로운 한 주, 새로운 시작',
        '월요일 기분? 아니어도 OK, 오늘이 시작',
      ], 'week0'),
      sub: '꾸준함이 제일 큰 무기예요',
    }
  }

  if (weekCount === 1) {
    return {
      main: pickDaily([
        '좋은 출발! 한 번 더 가볼까요?',
        '1회 완료 — 분위기 탔어요',
        '첫 루틴 끝! 다음도 기대돼요',
      ], 'week1'),
      sub: `${weekProgress} · ${WEEKLY_GOAL - weekCount}번 더 하면 목표 달성`,
    }
  }

  if (weekCount === 2) {
    return {
      main: pickDaily([
        '거의 다 왔어요! 한 번만 더',
        '2/3 — 마지막 한 방 남았어요',
        '이번 주 마무리가 코앞이에요',
      ], 'week2'),
      sub: `${weekProgress} · 한 번 더 하면 이번 주 완료`,
    }
  }

  if (weekCount >= WEEKLY_GOAL) {
    return {
      main: pickDaily([
        '이번 주도 잘하고 있어요',
        '목표 달성! 쉬는 것도 훈련이에요',
        '3회 채웠으니 오늘은 편히 쉬세요',
      ], 'rest-goal'),
      sub: '근육은 쉴 때 자라요 😴',
    }
  }

  return {
    main: pickDaily([
      '쉬는 날도 성장의 일부예요',
      '회복도 운동의 한 몫이에요',
      '다음 루틴까지 충분히 쉬세요',
      '오늘은 몸 챙기는 날',
      '3분할? 쉬는 날이 있어야 해요',
    ], 'rest'),
    sub: streak.current >= 2 ? `🔥 ${streak.current}일 연속 기록 · ${weekProgress}` : weekProgress,
  }
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
