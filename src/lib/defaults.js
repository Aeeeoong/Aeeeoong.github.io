export function getDefaultSettings() {
  return {
    routineOrder: ['하체', '등', '가슴어깨'],
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
    },
  }
}

export function getDefaultData() {
  return {
    workouts: [],
    inbody: [],
    settings: getDefaultSettings(),
  }
}
