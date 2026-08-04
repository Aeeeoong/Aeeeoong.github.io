const ONBOARDING_KEY_PREFIX = 'workout_onboarding_seen_'

export function hasSeenOnboarding(username) {
  if (!username) return true
  return localStorage.getItem(`${ONBOARDING_KEY_PREFIX}${username}`) === '1'
}

export function markOnboardingSeen(username) {
  if (!username) return
  localStorage.setItem(`${ONBOARDING_KEY_PREFIX}${username}`, '1')
}

export function clearOnboardingSeen(username) {
  if (!username) return
  localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}${username}`)
}

export const ONBOARDING_STEPS = [
  {
    title: '기록하기',
    body: '「기록」 탭에서 **자유** 루틴으로 오늘 한 운동만 골라 입력하세요. 「운동 추가」로 기구를 선택할 수 있어요.',
  },
  {
    title: '파트너와 함께',
    body: '화면 상단 **사용자** 영역에서 이름을 눌러 전환하세요. 혼자면 「+ 사용자 추가」로 파트너 이름을 먼저 등록하면 됩니다.',
  },
  {
    title: '루틴·기구 설정',
    body: '「설정」에서 루틴과 기구 목록을 바꿀 수 있어요. 덤벨 운동은 기구 이름에 「덤벨」을 넣으면 한 손 kg 안내가 나와요.',
  },
  {
    title: '꾸준히!',
    body: '홈에서 **이번 주 운동 횟수**와 동기부여 문구를 확인하세요. 작은 기록이 쌓이면 통계·PR도 자동으로 채워져요.',
  },
]
