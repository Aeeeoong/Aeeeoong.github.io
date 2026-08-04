export function getDefaultSettings() {
  return {
    routineOrder: ['하체', '등', '가슴어깨', '유산소', '자유'],
    exerciseProfiles: {},
    exercises: {
      하체: [
        '브이스쿼트',
        '레그프레스',
        '레그익스텐션',
        '레그컬',
        '어브덕션',
        '어덕션',
      ],
      등: [
        '랫풀다운',
        'MTS rows',
        '아이소 랫풀다운',
        '어시스트 풀업',
        '오버헤드 프레스',
      ],
      가슴어깨: [
        '체스트 프레스',
        '플라이',
        '복근',
        '케이블 푸시다운',
        '어시스트 딥',
      ],
      유산소: ['천국의 계단', '런닝머신 (평지)', '런닝머신 (경사)'],
      자유: [],
    },
  }
}

/** 저장된 설정에 기본값의 새 루틴·기구 목록을 병합 */
export function mergeSettingsWithDefaults(saved = {}) {
  const defaults = getDefaultSettings()
  const routineOrder = [...(saved.routineOrder || defaults.routineOrder)]
  for (const routine of defaults.routineOrder) {
    if (!routineOrder.includes(routine)) {
      routineOrder.push(routine)
    }
  }

  const exercises = { ...defaults.exercises }
  for (const [routine, list] of Object.entries(saved.exercises || {})) {
    exercises[routine] = list
  }

  return {
    exerciseProfiles: { ...defaults.exerciseProfiles, ...(saved.exerciseProfiles || {}) },
    routineOrder,
    exercises,
  }
}

export function getDefaultData() {
  return {
    workouts: [],
    inbody: [],
    settings: getDefaultSettings(),
  }
}
