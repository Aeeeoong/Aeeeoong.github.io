export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function displayDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export function getTodayString() {
  return formatDate(new Date())
}

export function getRelativeTime(date) {
  const now = new Date()
  const target = new Date(date)
  const diffDays = Math.floor((now - target) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  return `${Math.floor(diffDays / 30)}개월 전`
}

export function formatNumber(num, decimal = 1) {
  if (num == null || Number.isNaN(Number(num))) return '-'
  return Number(num).toFixed(decimal)
}
