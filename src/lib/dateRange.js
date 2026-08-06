import { formatDate } from './utils'

export const STATS_PERIODS = [
  { key: 'all', label: '전체' },
  { key: '4w', label: '4주' },
  { key: '3m', label: '3개월' },
  { key: 'ytd', label: '올해' },
]

export function getStatsDateRange(periodKey) {
  const today = new Date()
  const endDate = formatDate(today)

  if (periodKey === 'all') return { startDate: null, endDate: null }

  if (periodKey === '4w') {
    const start = new Date(today)
    start.setDate(start.getDate() - 28)
    return { startDate: formatDate(start), endDate }
  }

  if (periodKey === '3m') {
    const start = new Date(today)
    start.setMonth(start.getMonth() - 3)
    return { startDate: formatDate(start), endDate }
  }

  if (periodKey === 'ytd') {
    return { startDate: `${today.getFullYear()}-01-01`, endDate }
  }

  return { startDate: null, endDate: null }
}

export function filterByDateRange(items, startDate, endDate) {
  if (!startDate && !endDate) return items
  return items.filter((item) => {
    if (startDate && item.date < startDate) return false
    if (endDate && item.date > endDate) return false
    return true
  })
}
