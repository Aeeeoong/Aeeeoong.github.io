import { useEffect, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import {
  exportBundle,
  getSettings,
  importBundle,
  resetSettings,
  saveSettings,
} from '../services/storage'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState(null)
  const [routineModal, setRoutineModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null)
  const [routineName, setRoutineName] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const s = await getSettings(user)
    setSettings(s)
  }

  useEffect(() => {
    refresh().catch((err) => alert(`설정 로드 실패: ${err.message}`))
  }, [user])

  async function persist(next) {
    setBusy(true)
    try {
      await saveSettings(user, next)
      setSettings(next)
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveRoutine() {
    const name = routineName.trim()
    if (!name) {
      alert('루틴 이름을 입력하세요.')
      return
    }
    const next = structuredClone(settings)
    if (routineModal?.mode === 'edit') {
      const oldName = next.routineOrder[routineModal.index]
      next.routineOrder[routineModal.index] = name
      if (oldName !== name) {
        next.exercises[name] = next.exercises[oldName] || []
        delete next.exercises[oldName]
      }
    } else {
      if (next.routineOrder.includes(name)) {
        alert('이미 존재하는 루틴 이름입니다.')
        return
      }
      next.routineOrder.push(name)
      next.exercises[name] = []
    }
    await persist(next)
    setRoutineModal(null)
  }

  async function handleSaveExercise() {
    const name = exerciseName.trim()
    if (!name || !exerciseModal) return
    const next = structuredClone(settings)
    const list = next.exercises[exerciseModal.routine] || []
    if (exerciseModal.mode === 'edit') {
      list[exerciseModal.index] = name
    } else {
      if (list.includes(name)) {
        alert('이미 존재하는 운동 이름입니다.')
        return
      }
      list.push(name)
    }
    next.exercises[exerciseModal.routine] = list
    await persist(next)
    setExerciseModal(null)
  }

  async function handleExport() {
    try {
      const data = await exportBundle(user)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workout-tracker-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      alert('데이터를 내보냈습니다.')
    } catch (err) {
      alert(`내보내기 실패: ${err.message}`)
    }
  }

  async function handleImportFile(file) {
    if (!file) return
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await importBundle(user, json)
      await refresh()
      alert('데이터를 Firebase로 가져왔습니다.')
    } catch (err) {
      alert(`가져오기 실패: ${err.message}`)
    }
  }

  if (!settings) {
    return (
      <>
        <PageHeader title="설정" />
        <main className="container">
          <div className="loading">
            <div className="spinner" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="설정" />
      <main className="container">
        <div className="card">
          <h2 className="card-title">계정</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            현재 사용자: <strong style={{ color: 'var(--text-primary)' }}>{user}</strong>
          </p>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--success)' }}>
            저장소: Firebase Firestore (로컬 폴백 없음)
          </p>
          <button
            type="button"
            className="btn"
            style={{ background: 'var(--danger)', color: 'white' }}
            onClick={() => {
              if (confirm('로그아웃하시겠습니까?')) logout()
            }}
          >
            로그아웃
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">루틴 관리</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setRoutineName('')
                setRoutineModal({ mode: 'add' })
              }}
            >
              루틴 추가
            </button>
          </div>

          <div className="routines-list">
            {settings.routineOrder.map((name, index) => {
              const exercises = settings.exercises[name] || []
              return (
                <div key={name} className="routine-card">
                  <div className="routine-header">
                    <div>
                      <h3 className="routine-name">{name}</h3>
                      <p className="routine-count">{exercises.length}개 운동</p>
                    </div>
                    <div className="routine-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === 0 || busy}
                        onClick={async () => {
                          const next = structuredClone(settings)
                          ;[next.routineOrder[index - 1], next.routineOrder[index]] = [
                            next.routineOrder[index],
                            next.routineOrder[index - 1],
                          ]
                          await persist(next)
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        disabled={index === settings.routineOrder.length - 1 || busy}
                        onClick={async () => {
                          const next = structuredClone(settings)
                          ;[next.routineOrder[index + 1], next.routineOrder[index]] = [
                            next.routineOrder[index],
                            next.routineOrder[index + 1],
                          ]
                          await persist(next)
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          setRoutineName(name)
                          setRoutineModal({ mode: 'edit', index })
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="btn-icon danger"
                        onClick={async () => {
                          if (!confirm(`"${name}" 루틴을 삭제하시겠습니까?`)) return
                          const next = structuredClone(settings)
                          next.routineOrder.splice(index, 1)
                          delete next.exercises[name]
                          await persist(next)
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="exercises-list">
                    {exercises.map((ex, exIndex) => (
                      <div key={`${name}-${ex}`} className="exercise-item-settings">
                        <span className="exercise-name">{ex}</span>
                        <div className="exercise-actions">
                          <button
                            type="button"
                            className="btn-icon-small"
                            disabled={exIndex === 0}
                            onClick={async () => {
                              const next = structuredClone(settings)
                              const list = next.exercises[name]
                              ;[list[exIndex - 1], list[exIndex]] = [list[exIndex], list[exIndex - 1]]
                              await persist(next)
                            }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn-icon-small"
                            disabled={exIndex === exercises.length - 1}
                            onClick={async () => {
                              const next = structuredClone(settings)
                              const list = next.exercises[name]
                              ;[list[exIndex + 1], list[exIndex]] = [list[exIndex], list[exIndex + 1]]
                              await persist(next)
                            }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="btn-icon-small"
                            onClick={() => {
                              setExerciseName(ex)
                              setExerciseModal({ mode: 'edit', routine: name, index: exIndex })
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="btn-icon-small danger"
                            onClick={async () => {
                              if (!confirm(`"${ex}" 운동을 삭제하시겠습니까?`)) return
                              const next = structuredClone(settings)
                              next.exercises[name].splice(exIndex, 1)
                              await persist(next)
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-add-exercise"
                      onClick={() => {
                        setExerciseName('')
                        setExerciseModal({ mode: 'add', routine: name })
                      }}
                    >
                      + 운동 추가
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">데이터</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleExport}>
              Firebase 데이터 내보내기
            </button>
            <label className="btn" style={{ background: 'var(--bg-main)', textAlign: 'center', cursor: 'pointer' }}>
              JSON 가져오기 → Firebase
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--warning)', color: '#111' }}
              onClick={async () => {
                if (!confirm('루틴 설정을 기본값으로 초기화할까요? (운동 기록은 유지)')) return
                const defaults = await resetSettings(user)
                setSettings(defaults)
                alert('설정이 초기화되었습니다.')
              }}
            >
              루틴 설정 초기화
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">앱 정보</h2>
          <p style={{ color: 'var(--text-secondary)' }}>버전 2.0.0 · React + Vite + Firebase</p>
        </div>
      </main>

      {routineModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setRoutineModal(null)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{routineModal.mode === 'edit' ? '루틴 편집' : '루틴 추가'}</h3>
              <button type="button" className="modal-close" onClick={() => setRoutineModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">루틴 이름</label>
              <input
                className="form-input"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setRoutineModal(null)}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveRoutine}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {exerciseModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setExerciseModal(null)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>
                {exerciseModal.routine} - {exerciseModal.mode === 'edit' ? '운동 편집' : '운동 추가'}
              </h3>
              <button type="button" className="modal-close" onClick={() => setExerciseModal(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label className="form-label">운동 이름</label>
              <input
                className="form-input"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setExerciseModal(null)}>
                취소
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveExercise}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
