import { formatDate } from './utils'
import {
  formatExerciseValue,
  getExerciseProfile,
  improvementDelta,
  isCardioProfile,
  isPersonalBestValue,
  personalBestLabel,
  tracksPersonalBest,
  usesIntegerValue,
  valueUnitForCompare,
} from './exerciseConfig'

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

/** Epley 공식 — UI에는 "예상 1회"로만 표시 */
export function estimateOneRepMax(weight, reps) {
  const w = Number(weight)
  const r = Number(reps)
  if (!w || w <= 0 || !r || r <= 0) return null
  if (r === 1) return w
  return w * (1 + r / 30)
}

export function getExerciseEstimated1RM(exercise, profile) {
  if (profile && !profile.useE1RM) return null
  const m = getExerciseMetrics(exercise)
  if (!m?.maxWeight || !m.reps) return null
  return estimateOneRepMax(m.maxWeight, m.reps)
}

export function isExerciseFilled(exercise) {
  if (exercise.comment?.trim()) return true
  if (exercise.mode === 'cardio') {
    const c = exercise.cardio || {}
    return c.speed != null || c.minutes != null || c.incline != null
  }
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

function formatImprovement(improvement, unit, decimals = 1) {
  if (improvement === 0) return { text: '변화 없음', tone: 'neutral' }
  if (improvement > 0) {
    const value = decimals > 0 ? improvement.toFixed(decimals) : String(improvement)
    return { text: `+${value}${unit}`, tone: 'up' }
  }
  const value = decimals > 0 ? Math.abs(improvement).toFixed(decimals) : String(Math.abs(improvement))
  return { text: `-${value}${unit}`, tone: 'down' }
}

/** 현재 입력 vs 지난 기록 비교 */
export function compareWithPrevious(currentExercise, previousExercise, profile) {
  const cur = getExerciseMetrics(currentExercise)
  const prev = getExerciseMetrics(previousExercise)
  if (!cur || !prev || !profile) return null

  const unit = valueUnitForCompare(profile)
  const valueDecimals = usesIntegerValue(profile) ? 0 : 1
  const parts = []

  if (cur.maxWeight != null && prev.maxWeight != null) {
    const imp = improvementDelta(cur.maxWeight, prev.maxWeight, profile)
    parts.push({
      key: 'weight',
      label: profile.inputLabel,
      ...formatImprovement(imp, unit, valueDecimals),
    })
  }
  if (cur.reps != null && prev.reps != null) {
    parts.push({
      key: 'reps',
      label: '회',
      ...formatImprovement(cur.reps - prev.reps, '회', 0),
    })
  }
  if (cur.sets != null && prev.sets != null) {
    parts.push({
      key: 'sets',
      label: '세트',
      ...formatImprovement(cur.sets - prev.sets, '세트', 0),
    })
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

/** 주간 운동 목표 — 3일+휴1 패턴 기준 약 5~6회/주, 목표는 5회 */
const WEEKLY_GOAL = 5

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
        `${WEEKLY_GOAL}회 채웠어요 — 이번 주 MVP`,
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

  if (weekCount >= 1 && weekCount < WEEKLY_GOAL - 1) {
    return {
      main: pickDaily([
        '좋은 출발! 한 번 더 가볼까요?',
        `${weekCount}회 완료 — 분위기 탔어요`,
        '꾸준히 쌓이고 있어요',
      ], 'week-early'),
      sub: `${weekProgress} · ${WEEKLY_GOAL - weekCount}번 더 하면 목표 달성`,
    }
  }

  if (weekCount === WEEKLY_GOAL - 1) {
    return {
      main: pickDaily([
        '거의 다 왔어요! 한 번만 더',
        `${weekCount}/${WEEKLY_GOAL} — 마지막 한 방 남았어요`,
        '이번 주 마무리가 코앞이에요',
      ], 'week-almost'),
      sub: `${weekProgress} · 한 번 더 하면 이번 주 완료`,
    }
  }

  if (weekCount >= WEEKLY_GOAL) {
    return {
      main: pickDaily([
        '이번 주도 잘하고 있어요',
        '목표 달성! 쉬는 것도 훈련이에요',
        `${WEEKLY_GOAL}회 채웠으니 오늘은 편히 쉬세요`,
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
      '3일+휴1? 쉬는 날이 있어야 해요',
    ], 'rest'),
    sub: streak.current >= 2 ? `🔥 ${streak.current}일 연속 기록 · ${weekProgress}` : weekProgress,
  }
}

/** 뉴비 친화 주간 요약 */
export function getWeeklySummary(workouts, inbodyRecords = [], settings = null) {
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

  const improvement = findWeeklyImprovement(thisWeek, lastWeek, settings)
  const bestLift = findWeeklyBestLift(thisWeek, settings)

  const lines = [countMessage]
  if (busiestLine) lines.push(busiestLine)
  if (improvement) lines.push(improvement)
  if (bestLift) lines.push(bestLift)

  return {
    weekStart,
    weekEnd,
    workoutCount,
    countDiff,
    lines,
    encouragement:
      workoutCount >= WEEKLY_GOAL
        ? '이번 주 정말 잘하고 있어요!'
        : workoutCount >= 1
          ? '조금씩 꾸준히 — 다음 운동도 화이팅!'
          : '이번 주 첫 운동을 기록해보세요',
  }
}

function aggregateWeekValues(workouts, settings) {
  const map = {}
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      const m = getExerciseMetrics(ex)
      if (m?.maxWeight == null) continue
      const profile = getExerciseProfile(ex.name, settings)
      const val = m.maxWeight
      if (map[ex.name] == null) {
        map[ex.name] = { value: val, profile }
      } else if (profile.better === 'lower') {
        map[ex.name].value = Math.min(map[ex.name].value, val)
      } else {
        map[ex.name].value = Math.max(map[ex.name].value, val)
      }
    }
  }
  return map
}

function findWeeklyImprovement(thisWeek, lastWeek, settings) {
  const thisBest = aggregateWeekValues(thisWeek, settings)
  const lastBest = aggregateWeekValues(lastWeek, settings)

  let bestName = null
  let bestDiff = 0
  let bestLine = null

  for (const [name, { value, profile }] of Object.entries(thisBest)) {
    const prev = lastBest[name]?.value
    if (prev == null) continue
    const diff = improvementDelta(value, prev, profile)
    if (diff == null || diff <= 0 || diff <= bestDiff) continue
    bestDiff = diff
    bestName = name
    const unit = valueUnitForCompare(profile)
    const fmt = (v) => formatExerciseValue(v, profile)
    bestLine = `${name}: ${fmt(prev)} → ${fmt(value)} (+${usesIntegerValue(profile) ? diff : diff.toFixed(1) + unit})`
  }

  if (bestLine) return bestLine

  const firstNew = Object.keys(thisBest).find((name) => lastBest[name] == null)
  if (firstNew) {
    const { value, profile } = thisBest[firstNew]
    return `${firstNew} 이번 주 ${formatExerciseValue(value, profile)} — 지난주 기록 없음`
  }

  return null
}

/** 이번 주 예상 1회 최고 — kg 기구만 */
function findWeeklyBestLift(thisWeek, settings) {
  let best = null

  for (const workout of thisWeek) {
    for (const ex of workout.exercises || []) {
      const profile = getExerciseProfile(ex.name, settings)
      if (!profile.useE1RM) continue

      const m = getExerciseMetrics(ex)
      const e1rm = getExerciseEstimated1RM(ex, profile)
      if (!e1rm || !m?.maxWeight || !m.reps) continue

      if (!best || e1rm > best.e1rm) {
        best = {
          name: ex.name,
          e1rm,
          weight: m.maxWeight,
          reps: m.reps,
        }
      }
    }
  }

  if (!best) return null
  return `💪 이번 주 베스트: ${best.name} — 예상 1회 ${best.e1rm.toFixed(1)}kg (${best.weight}kg×${best.reps}회)`
}

/** 운동별 역대 최고/최저 */
export function getPersonalBests(workouts, settings = null) {
  const bests = {}

  for (const workout of workouts) {
    for (const ex of workout.exercises || []) {
      const m = getExerciseMetrics(ex)
      if (!m?.maxWeight) continue
      const name = ex.name
      const profile = getExerciseProfile(name, settings)
      if (!tracksPersonalBest(profile)) continue
      const value = m.maxWeight

      if (!bests[name]) {
        bests[name] = {
          bestValue: value,
          better: profile.better,
          profile,
          maxTotalReps: 0,
          bestDate: workout.date,
          sessions: 0,
          maxWeight: value,
        }
      }

      bests[name].sessions++
      if (isPersonalBestValue(value, bests[name].bestValue, profile)) {
        bests[name].bestValue = value
        bests[name].maxWeight = value
        bests[name].bestDate = workout.date
      }
      if (m.totalReps && m.totalReps > bests[name].maxTotalReps) {
        bests[name].maxTotalReps = m.totalReps
      }
    }
  }

  return bests
}

export function checkPersonalBest(exerciseName, currentExercise, bests, profile) {
  const cur = getExerciseMetrics(currentExercise)
  if (!cur?.maxWeight || !profile) return null

  const best = bests[exerciseName]
  if (!best?.bestValue || !isPersonalBestValue(cur.maxWeight, best.bestValue, profile)) return null

  const diff = Math.abs(cur.maxWeight - best.bestValue)
  return {
    previous: best.bestValue,
    current: cur.maxWeight,
    diff,
    profile,
  }
}

/** 현재 입력 vs 역대 최고/최저 */
export function compareWithPersonalBest(currentExercise, bestEntry, profile) {
  const cur = getExerciseMetrics(currentExercise)
  if (!cur?.maxWeight || !bestEntry?.bestValue || !profile) return null

  const bestVal = bestEntry.bestValue
  const imp = improvementDelta(cur.maxWeight, bestVal, profile)
  const fmt = (v) => formatExerciseValue(v, profile)
  const pbLabel = personalBestLabel(profile)

  if (imp != null && imp > 0) {
    const unit = valueUnitForCompare(profile)
    return {
      status: 'beat',
      best: bestVal,
      diff: imp,
      label: `${pbLabel} ${fmt(bestVal)} → ${fmt(cur.maxWeight)} (+${usesIntegerValue(profile) ? imp : imp.toFixed(1) + unit})`,
    }
  }
  if (imp === 0) {
    return {
      status: 'tie',
      best: bestVal,
      label: `${fmt(bestVal)} · ${pbLabel}와 동일`,
    }
  }

  const remaining = profile.better === 'lower' ? cur.maxWeight - bestVal : bestVal - cur.maxWeight
  const unit = valueUnitForCompare(profile)
  return {
    status: 'below',
    best: bestVal,
    remaining,
    label: `${pbLabel} ${fmt(bestVal)} · ${profile.better === 'lower' ? `${remaining.toFixed(1)}${unit} 더 줄이면 갱신` : `${remaining.toFixed(1)}${unit} 남음`}`,
  }
}

export function getWorkoutDateSet(workouts) {
  return new Set(workouts.map((w) => w.date))
}

/** 통계용 — 선택 운동 요약 (뉴비 친화) */
export function getExerciseSummary(progress, exerciseName, bests, profile) {
  if (!progress.length) return null

  const totalSessions = progress.length

  if (isCardioProfile(profile)) {
    const minutesList = progress
      .map((p) => p.cardio?.minutes ?? p.minutes)
      .filter((m) => m != null && m > 0)
    const totalMinutes = minutesList.reduce((sum, m) => sum + m, 0)
    const longestMinutes = minutesList.length ? Math.max(...minutesList) : null

    return {
      totalSessions,
      totalMinutes,
      longestMinutes,
      allTimeBest: longestMinutes,
      pbLabel: '최장 시간',
      isCardio: true,
      profile,
    }
  }

  const weights = progress.map((p) => p.weight).filter((w) => w != null && w > 0)
  const maxWeight = weights.length ? Math.max(...weights) : null
  const totalReps = progress.reduce((sum, p) => {
    if (p.mode === 'detailed' && p.setsDetail?.length) {
      return sum + p.setsDetail.reduce((s, set) => s + (Number(set.reps) || 0), 0)
    }
    return sum + (Number(p.reps) || 0) * (Number(p.sets) || 1)
  }, 0)

  const best = bests[exerciseName]
  const pbLabel = profile ? personalBestLabel(profile) : '역대 최고'

  return {
    maxWeight,
    totalSessions,
    totalReps,
    allTimeBest: best?.bestValue ?? maxWeight,
    bestDate: best?.bestDate,
    pbLabel,
    isCardio: false,
    profile,
  }
}

export function formatWeekRangeLabel(weekStart, weekEnd) {
  const s = new Date(`${weekStart}T12:00:00`)
  const e = new Date(`${weekEnd}T12:00:00`)
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()} (월~일)`
}
