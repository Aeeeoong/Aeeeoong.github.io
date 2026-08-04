import {
  emptyCardioForProfile,
  getExerciseProfile,
  isCardioProfile,
  normalizeCardioForSave,
} from './exerciseConfig'

export function emptyExercise(name, settings = null) {
  const profile = getExerciseProfile(name, settings)
  if (isCardioProfile(profile)) {
    return {
      name,
      mode: 'cardio',
      cardio: emptyCardioForProfile(profile),
      comment: '',
    }
  }
  return {
    name,
    mode: 'simple',
    weight: null,
    sets: null,
    reps: null,
    comment: '',
    setsCount: 4,
    setsDetail: [
      { weight: null, reps: null },
      { weight: null, reps: null },
      { weight: null, reps: null },
      { weight: null, reps: null },
    ],
  }
}

/** Firestore에 저장된 운동 → 편집 폼 상태 */
export function exerciseFromSaved(ex, settings = null) {
  const profile = getExerciseProfile(ex.name, settings)
  if (ex.mode === 'cardio' || isCardioProfile(profile)) {
    const base = emptyCardioForProfile(profile)
    return {
      name: ex.name,
      mode: 'cardio',
      cardio: {
        ...base,
        incline: ex.cardio?.incline ?? base.incline ?? null,
        speed: ex.cardio?.speed ?? null,
        minutes: ex.cardio?.minutes ?? null,
      },
      comment: ex.comment || '',
    }
  }

  if (ex.mode === 'detailed' && ex.setsDetail?.length) {
    return {
      name: ex.name,
      mode: 'detailed',
      weight: ex.weight ?? null,
      sets: ex.sets ?? null,
      reps: ex.reps ?? null,
      comment: ex.comment || '',
      setsCount: ex.setsDetail.length,
      setsDetail: ex.setsDetail.map((s) => ({
        weight: s.weight ?? null,
        reps: s.reps ?? null,
      })),
    }
  }
  return {
    name: ex.name,
    mode: 'simple',
    weight: ex.weight ?? null,
    sets: ex.sets ?? null,
    reps: ex.reps ?? null,
    comment: ex.comment || '',
    setsCount: 4,
    setsDetail: [
      { weight: null, reps: null },
      { weight: null, reps: null },
      { weight: null, reps: null },
      { weight: null, reps: null },
    ],
  }
}

/** 편집 폼 상태 → 저장용 exercises 배열. 비어 있으면 에러 메시지 문자열 반환 */
export function serializeExercises(exercises, settings = null) {
  const workoutExercises = exercises
    .map((ex) => {
      const profile = getExerciseProfile(ex.name, settings)

      if (ex.mode === 'cardio' || isCardioProfile(profile)) {
        const cardio = normalizeCardioForSave(ex.cardio, profile)
        const hasData =
          cardio.speed != null ||
          cardio.minutes != null ||
          (cardio.incline != null && profile.inclineFixed == null)
        if (!hasData && !ex.comment) return null
        return {
          name: ex.name,
          mode: 'cardio',
          cardio,
          comment: ex.comment || '',
        }
      }

      if (ex.mode === 'simple') {
        if (ex.weight != null || ex.sets != null || ex.reps != null || ex.comment) {
          return {
            name: ex.name,
            mode: 'simple',
            weight: ex.weight != null ? Number(ex.weight) : null,
            sets: ex.sets != null ? Number(ex.sets) : null,
            reps: ex.reps != null ? Number(ex.reps) : null,
            comment: ex.comment || '',
          }
        }
        return null
      }

      const setsDetail = (ex.setsDetail || [])
        .map((s, i) => ({
          set: i + 1,
          weight: s.weight != null ? Number(s.weight) : null,
          reps: s.reps != null ? Number(s.reps) : null,
        }))
        .filter((s) => s.weight != null || s.reps != null)

      if (setsDetail.length === 0 && !ex.comment) return null

      const avgWeight =
        setsDetail.length > 0
          ? setsDetail.reduce((sum, s) => sum + (s.weight || 0), 0) / setsDetail.length
          : null
      const avgReps =
        setsDetail.length > 0
          ? setsDetail.reduce((sum, s) => sum + (s.reps || 0), 0) / setsDetail.length
          : null

      return {
        name: ex.name,
        mode: 'detailed',
        weight: avgWeight,
        sets: setsDetail.length,
        reps: avgReps ? Math.round(avgReps) : null,
        setsDetail,
        comment: ex.comment || '',
      }
    })
    .filter(Boolean)

  if (workoutExercises.length === 0) {
    return { error: '최소 1개 이상의 운동을 입력해주세요.' }
  }
  return { exercises: workoutExercises }
}
