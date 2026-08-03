import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { deleteWorkout, getSettings, getWorkouts } from '../services/storage'
import { displayDate, getRelativeTime } from '../lib/utils'

export default function HistoryPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('')
  const [routines, setRoutines] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)

  async function load(type = filter) {
    setLoading(true)
    try {
      const list = await getWorkouts(user, type ? { type } : {})
      setWorkouts(list)
    } catch (err) {
      alert(`로드 실패: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSettings(user).then((s) => setRoutines(s.routineOrder || []))
  }, [user])

  useEffect(() => {
    load(filter)
  }, [user, filter])

  async function handleDelete(id) {
    if (!confirm('이 운동 기록을 삭제하시겠습니까?')) return
    try {
      await deleteWorkout(user, id)
      await load(filter)
    } catch (err) {
      alert(`삭제 실패: ${err.message}`)
    }
  }

  return (
    <>
      <PageHeader title="운동 내역" />
      <main className="container">
        <div className="card">
          <label className="form-label">루틴 필터</label>
          <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">전체</option>
            {routines.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-text">운동 기록이 없습니다</div>
              <Link to="/record" className="btn btn-primary">
                첫 운동 기록하기
              </Link>
            </div>
          </div>
        ) : (
          workouts.map((workout) => (
            <div key={workout.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                    {displayDate(workout.date)} ({getRelativeTime(workout.date)})
                  </div>
                  <span className="history-type">{workout.type}</span>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', background: 'var(--danger)', color: 'white' }}
                  onClick={() => handleDelete(workout.id)}
                >
                  삭제
                </button>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                {(workout.exercises || []).map((ex, idx) => {
                  const isDetailed = ex.mode === 'detailed' && ex.setsDetail?.length
                  return (
                    <div key={`${ex.name}-${idx}`} style={{ background: 'var(--bg-main)', padding: '0.75rem', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{ex.name}</div>
                        {isDetailed && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>상세</span>
                        )}
                      </div>
                      {isDetailed ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {ex.setsDetail.map((set) => (
                            <div
                              key={set.set}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.5rem',
                                background: 'var(--bg-card)',
                                borderRadius: 6,
                              }}
                            >
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                {set.set}세트
                              </span>
                              <span style={{ fontSize: '0.875rem' }}>
                                {set.weight ? `${set.weight}kg` : '-'} × {set.reps ? `${set.reps}회` : '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                          {ex.weight ? `${ex.weight}kg ` : ''}
                          {ex.sets ? `${ex.sets} 세트 ` : ''}
                          {ex.reps ? `${ex.reps}회` : ''}
                        </div>
                      )}
                      {ex.comment && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          {ex.comment}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </>
  )
}
