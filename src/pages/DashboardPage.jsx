import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getLatestInbody, getWorkoutStats, getWorkouts } from '../services/storage'
import { displayDate, formatNumber } from '../lib/utils'

function Calendar({ workouts }) {
  const [cursor, setCursor] = useState(new Date())
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const workoutDates = new Set(workouts.map((w) => w.date))

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const prevLastDay = new Date(year, month, 0)
  const firstDayOfWeek = firstDay.getDay()
  const lastDate = lastDay.getDate()
  const prevLastDate = prevLastDay.getDate()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const cells = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ key: `p-${i}`, label: prevLastDate - i, empty: true })
  }
  for (let date = 1; date <= lastDate; date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
    cells.push({
      key: dateStr,
      label: date,
      dateStr,
      hasWorkout: workoutDates.has(dateStr),
      today: dateStr === todayStr,
    })
  }
  const remaining = 42 - cells.length
  for (let date = 1; date <= remaining; date++) {
    cells.push({ key: `n-${date}`, label: date, empty: true })
  }

  return (
    <div className="card">
      <div className="card-header">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          &lt;
        </button>
        <h2 className="card-title">
          {year}년 {month + 1}월
        </h2>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          &gt;
        </button>
      </div>
      <div className="calendar">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="calendar-day-header">
            {d}
          </div>
        ))}
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={[
              'calendar-day',
              cell.empty ? 'empty' : '',
              cell.hasWorkout ? 'has-workout' : '',
              cell.today ? 'today' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!cell.hasWorkout) return
              const dayWorkouts = workouts.filter((w) => w.date === cell.dateStr)
              if (dayWorkouts[0]) {
                alert(
                  `${cell.dateStr}\n\n${dayWorkouts[0].type} 운동\n${dayWorkouts[0].exercises.length}개 운동 완료`,
                )
              }
            }}
          >
            {cell.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [latestInbody, setLatestInbody] = useState(null)
  const [recent, setRecent] = useState([])
  const [workouts, setWorkouts] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [s, inbody, all] = await Promise.all([
          getWorkoutStats(user),
          getLatestInbody(user),
          getWorkouts(user),
        ])
        if (cancelled) return
        setStats(s)
        setLatestInbody(inbody)
        setWorkouts(all)
        setRecent(all.slice(0, 5))
      } catch (err) {
        alert(`데이터 로드 실패: ${err.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <>
      <PageHeader
        title="운동 트래커"
        actions={
          <Link to="/record" className="btn btn-primary">
            기록하기
          </Link>
        }
      />
      <main className="container">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            <div className="stats-compact">
              <div className="stat-item">
                <div className="stat-compact-label">총 운동</div>
                <div className="stat-compact-value">{stats?.totalWorkouts ?? 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-compact-label">7일</div>
                <div className="stat-compact-value">{stats?.recentWorkouts ?? 0}</div>
              </div>
              <div className="stat-item">
                <div className="stat-compact-label">체중</div>
                <div className="stat-compact-value">
                  {latestInbody ? formatNumber(latestInbody.weight) : '-'}
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-compact-label">골격근</div>
                <div className="stat-compact-value">
                  {latestInbody ? formatNumber(latestInbody.muscleMass) : '-'}
                </div>
              </div>
            </div>

            <Calendar workouts={workouts} />

            <div className="card">
              <div className="card-header">
                <h2 className="card-title">최근 운동 기록</h2>
                <Link
                  to="/history"
                  style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                >
                  전체보기
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-text">아직 운동 기록이 없습니다</div>
                  <Link to="/record" className="btn btn-primary">
                    첫 운동 기록하기
                  </Link>
                </div>
              ) : (
                <ul className="history-list">
                  {recent.map((workout) => (
                    <li key={workout.id} className="history-item">
                      <div className="history-date">{displayDate(workout.date)}</div>
                      <span className="history-type">{workout.type}</span>
                      <div>{workout.exercises?.length || 0}개 운동</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}
