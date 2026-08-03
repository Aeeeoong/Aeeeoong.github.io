import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { addWorkout, getSettings, getWorkouts } from '../services/storage'
import { getTodayString } from '../lib/utils'

function emptySimple() {
  return { mode: 'simple', weight: '', sets: '', reps: '', comment: '', setsCount: 3, setsDetail: [] }
}

export default function RecordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [date, setDate] = useState(getTodayString())
  const [type, setType] = useState('')
  const [exercises, setExercises] = useState([])
  const [placeholders, setPlaceholders] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSettings(user).then((s) => {
      setSettings(s)
      const first = s.routineOrder[0]
      setType(first)
    })
  }, [user])

  useEffect(() => {
    if (!settings || !type) return

    async function setup() {
      const names = settings.exercises[type] || []
      setExercises(names.map((name) => ({ name, ...emptySimple() })))

      const recent = await getWorkouts(user)
      const recentWorkout = recent.find((w) => w.type === type)
      const map = {}
      names.forEach((name) => {
        map[name] = { weight: '0', sets: '0', reps: '0' }
        const recentExercise = recentWorkout?.exercises?.find((e) => e.name === name)
        if (!recentExercise) return
        if (recentExercise.mode === 'detailed' && recentExercise.setsDetail?.length) {
          const maxSet = recentExercise.setsDetail.reduce((max, set) =>
            (set.weight || 0) > (max.weight || 0) ? set : max,
          )
          map[name] = {
            weight: String(maxSet.weight || '0'),
            sets: String(recentExercise.setsDetail.length || '0'),
            reps: String(maxSet.reps || '0'),
          }
        } else {
          map[name] = {
            weight: String(recentExercise.weight || '0'),
            sets: String(recentExercise.sets || '0'),
            reps: String(recentExercise.reps || '0'),
          }
        }
      })
      setPlaceholders(map)
    }

    setup()
  }, [settings, type, user])

  const routineOptions = useMemo(() => settings?.routineOrder || [], [settings])

  function updateExercise(index, patch) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)))
  }

  function switchMode(index, mode) {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex
        if (mode === 'detailed' && (!ex.setsDetail || ex.setsDetail.length === 0)) {
          const count = ex.setsCount || 3
          return {
            ...ex,
            mode,
            setsDetail: Array.from({ length: count }, (_, n) => ({
              set: n + 1,
              weight: '',
              reps: '',
            })),
          }
        }
        return { ...ex, mode }
      }),
    )
  }

  function changeSetsCount(index, count) {
    const n = Math.min(10, Math.max(1, count || 1))
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex
        const next = Array.from({ length: n }, (_, si) => ({
          set: si + 1,
          weight: ex.setsDetail?.[si]?.weight ?? '',
          reps: ex.setsDetail?.[si]?.reps ?? '',
        }))
        return { ...ex, setsCount: n, setsDetail: next }
      }),
    )
  }

  function removeExercise(index) {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  function addExercise() {
    const all = settings?.exercises[type] || []
    const current = exercises.map((e) => e.name)
    const available = all.filter((n) => !current.includes(n))
    if (available.length === 0) {
      alert('추가할 수 있는 운동이 없습니다.')
      return
    }
    const name = prompt(`추가할 운동을 입력하세요:\n\n${available.join(', ')}`)
    if (!name) return
    if (!all.includes(name)) {
      alert('유효하지 않은 운동명입니다.')
      return
    }
    setExercises((prev) => [...prev, { name, ...emptySimple() }])
  }

  async function handleSave() {
    const workoutExercises = exercises
      .map((ex) => {
        if (ex.mode === 'simple') {
          if (ex.weight || ex.sets || ex.reps || ex.comment) {
            return {
              name: ex.name,
              mode: 'simple',
              weight: ex.weight ? parseFloat(ex.weight) : null,
              sets: ex.sets ? parseInt(ex.sets, 10) : null,
              reps: ex.reps ? parseInt(ex.reps, 10) : null,
              comment: ex.comment || '',
            }
          }
          return null
        }

        const setsDetail = (ex.setsDetail || [])
          .map((s, i) => ({
            set: i + 1,
            weight: s.weight ? parseFloat(s.weight) : null,
            reps: s.reps ? parseInt(s.reps, 10) : null,
          }))
          .filter((s) => s.weight || s.reps)

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
      alert('최소 1개 이상의 운동을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      await addWorkout(user, { date, type, exercises: workoutExercises })
      alert('운동 기록이 Firebase에 저장되었습니다!')
      navigate('/')
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="운동 기록"
        actions={
          <Link to="/" className="btn" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '0.5rem 1rem' }}>
            돌아가기
          </Link>
        }
      />
      <main className="container">
        <div className="card">
          <h2 className="card-title">오늘의 운동</h2>

          <div className="form-group">
            <label className="form-label">운동 날짜</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">운동 루틴</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {routineOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="exercise-grid">
            {exercises.map((ex, index) => {
              const ph = placeholders[ex.name] || { weight: '0', sets: '0', reps: '0' }
              return (
                <div key={`${ex.name}-${index}`} className="exercise-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div className="exercise-name">{ex.name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div className="mode-toggle">
                        <button
                          type="button"
                          className={`mode-btn${ex.mode === 'simple' ? ' active' : ''}`}
                          onClick={() => switchMode(index, 'simple')}
                        >
                          간편
                        </button>
                        <button
                          type="button"
                          className={`mode-btn${ex.mode === 'detailed' ? ' active' : ''}`}
                          onClick={() => switchMode(index, 'detailed')}
                        >
                          상세
                        </button>
                      </div>
                      <button type="button" className="btn-delete-exercise" onClick={() => removeExercise(index)}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {ex.mode === 'simple' ? (
                    <div className="exercise-inputs">
                      <div className="input-group">
                        <label>무게 (kg)</label>
                        <input
                          type="number"
                          step="0.5"
                          placeholder={ph.weight}
                          value={ex.weight}
                          onChange={(e) => updateExercise(index, { weight: e.target.value })}
                        />
                      </div>
                      <div className="input-group">
                        <label>세트</label>
                        <input
                          type="number"
                          placeholder={ph.sets}
                          value={ex.sets}
                          onChange={(e) => updateExercise(index, { sets: e.target.value })}
                        />
                      </div>
                      <div className="input-group">
                        <label>회</label>
                        <input
                          type="number"
                          placeholder={ph.reps}
                          value={ex.reps}
                          onChange={(e) => updateExercise(index, { reps: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="input-group">
                        <label>세트 수</label>
                        <input
                          type="number"
                          className="sets-count-input"
                          min={1}
                          max={10}
                          value={ex.setsCount || 3}
                          onChange={(e) => changeSetsCount(index, parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div className="sets-detail-container">
                        {(ex.setsDetail || []).map((set, si) => (
                          <div key={si} className="set-detail-item">
                            <div className="set-number">{si + 1}세트</div>
                            <div className="set-inputs">
                              <div className="input-group">
                                <label>무게 (kg)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  className="set-input"
                                  value={set.weight}
                                  onChange={(e) => {
                                    const next = [...ex.setsDetail]
                                    next[si] = { ...next[si], weight: e.target.value }
                                    updateExercise(index, { setsDetail: next })
                                  }}
                                />
                              </div>
                              <div className="input-group">
                                <label>회</label>
                                <input
                                  type="number"
                                  className="set-input"
                                  value={set.reps}
                                  onChange={(e) => {
                                    const next = [...ex.setsDetail]
                                    next[si] = { ...next[si], reps: e.target.value }
                                    updateExercise(index, { setsDetail: next })
                                  }}
                                />
                              </div>
                              {si < (ex.setsDetail?.length || 0) - 1 && (
                                <button
                                  type="button"
                                  className="copy-btn"
                                  onClick={() => {
                                    const next = [...ex.setsDetail]
                                    next[si + 1] = {
                                      ...next[si + 1],
                                      weight: next[si].weight,
                                      reps: next[si].reps,
                                    }
                                    updateExercise(index, { setsDetail: next })
                                  }}
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="input-group" style={{ marginTop: '0.75rem' }}>
                    <label>코멘트</label>
                    <input
                      type="text"
                      placeholder="예: 자세 좋음, 드랍세트"
                      value={ex.comment}
                      onChange={(e) => updateExercise(index, { comment: e.target.value })}
                    />
                  </div>
                </div>
              )
            })}

            <button type="button" className="btn-add-exercise" onClick={addExercise}>
              + 운동 추가
            </button>
          </div>

          <button type="button" className="btn btn-success btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Firebase 저장 중…' : '운동 기록 저장하기'}
          </button>
        </div>
      </main>
    </>
  )
}
