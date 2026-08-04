import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  App,
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd'
import { DeleteOutlined, HolderOutlined, HistoryOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import DateField from '../components/DateField'
import {
  ExerciseCompareHint,
  ExerciseDoneBadge,
  PersonalBestBadge,
} from '../components/ExerciseHints'
import { useAuth } from '../context/AuthContext'
import { addWorkout, getSettings, getWorkouts } from '../services/storage'
import { emptyExercise, exerciseFromSaved, serializeExercises } from '../lib/workoutForm'
import {
  checkPersonalBest,
  findPreviousExercise,
  getCompletionRate,
  getLastWorkoutByType,
  getPersonalBests,
  isExerciseFilled,
} from '../lib/workoutInsights'
import {
  clearRecordDraft,
  formatDraftTime,
  hasDraftContent,
  isValidDraft,
  loadRecordDraft,
  saveRecordDraft,
} from '../lib/recordDraft'
import { getTodayString } from '../lib/utils'

const { Text } = Typography

function SimpleExerciseInputs({ ex, ph, index, updateExercise }) {
  return (
    <div className="simple-exercise-inputs">
      <Form.Item label="무게" className="field-weight" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          step={0.5}
          precision={1}
          placeholder={ph.weight != null ? String(ph.weight) : '0.0'}
          value={ex.weight}
          onChange={(v) => updateExercise(index, { weight: v })}
        />
      </Form.Item>
      <Form.Item label="회" className="field-reps" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          placeholder={ph.reps != null ? String(ph.reps) : '0'}
          value={ex.reps}
          onChange={(v) => updateExercise(index, { reps: v })}
        />
      </Form.Item>
      <Form.Item label="세트" className="field-sets" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          placeholder={ph.sets != null ? String(ph.sets) : '0'}
          value={ex.sets}
          onChange={(v) => updateExercise(index, { sets: v })}
        />
      </Form.Item>
    </div>
  )
}

export default function RecordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [settings, setSettings] = useState(null)
  const [date, setDate] = useState(getTodayString())
  const [type, setType] = useState('')
  const [exercises, setExercises] = useState([])
  const [placeholders, setPlaceholders] = useState({})
  const [saving, setSaving] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  /** pending: 임시저장 확인 대기 | restored: 불러옴 | dismissed: 새로 시작 | none: 임시저장 없음 */
  const [draftStatus, setDraftStatus] = useState('pending')
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [allWorkouts, setAllWorkouts] = useState([])
  const touchDragRef = useRef(null)
  const draftSnapshotRef = useRef({ date, type, exercises, user })

  useEffect(() => {
    draftSnapshotRef.current = { date, type, exercises, user }
  }, [date, type, exercises, user])

  useEffect(() => {
    let cancelled = false
    async function init() {
      const s = await getSettings(user)
      if (cancelled) return
      setSettings(s)

      const draft = loadRecordDraft(user)
      if (isValidDraft(draft)) {
        setDraftSavedAt(draft.savedAt)
        return
      }

      setDraftStatus('none')
      setType(s.routineOrder[0] || '')
    }
    init()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    getWorkouts(user).then(setAllWorkouts)
  }, [user])

  useEffect(() => {
    if (!settings || draftStatus !== 'pending') return

    const draft = loadRecordDraft(user)
    if (!isValidDraft(draft)) {
      setDraftStatus('none')
      if (!type) setType(settings.routineOrder[0] || '')
      return
    }

    modal.confirm({
      title: '임시저장된 기록이 있습니다',
      content: `${draft.date} · ${draft.type} 루틴 (${formatDraftTime(draft.savedAt)}) — 이어서 작성할까요?`,
      okText: '불러오기',
      cancelText: '새로 시작',
      onOk: () => {
        setDate(draft.date)
        setType(draft.type)
        setExercises(draft.exercises)
        setDraftSavedAt(draft.savedAt)
        setDraftStatus('restored')
      },
      onCancel: () => {
        clearRecordDraft(user)
        setDraftSavedAt(null)
        setDraftStatus('dismissed')
        setType(settings.routineOrder[0] || '')
      },
    })
  }, [settings, draftStatus, user, modal, type])

  useEffect(() => {
    if (!settings || !type) return
    if (draftStatus === 'pending' || draftStatus === 'restored') return

    let cancelled = false
    async function setup() {
      const names = settings.exercises[type] || []
      setExercises(names.map((name) => emptyExercise(name)))
      const recent = await getWorkouts(user)
      if (cancelled) return
      const recentWorkout = recent.find((w) => w.type === type)
      const map = {}
      names.forEach((name) => {
        map[name] = { weight: null, sets: null, reps: null }
        const recentExercise = recentWorkout?.exercises?.find((e) => e.name === name)
        if (!recentExercise) return
        if (recentExercise.mode === 'detailed' && recentExercise.setsDetail?.length) {
          const maxSet = recentExercise.setsDetail.reduce((max, set) =>
            (set.weight || 0) > (max.weight || 0) ? set : max,
          )
          map[name] = {
            weight: maxSet.weight ?? null,
            sets: recentExercise.setsDetail.length,
            reps: maxSet.reps ?? null,
          }
        } else {
          map[name] = {
            weight: recentExercise.weight ?? null,
            sets: recentExercise.sets ?? null,
            reps: recentExercise.reps ?? null,
          }
        }
      })
      setPlaceholders(map)
    }
    setup()
    return () => {
      cancelled = true
    }
  }, [settings, type, user, draftStatus])

  useEffect(() => {
    if (!user || !settings || draftStatus === 'pending') return
    if (exercises.length === 0 || !hasDraftContent(exercises)) return

    const timer = setTimeout(() => {
      const savedAt = saveRecordDraft(user, { date, type, exercises })
      if (savedAt) setDraftSavedAt(savedAt)
    }, 800)
    return () => clearTimeout(timer)
  }, [user, settings, date, type, exercises, draftStatus])

  useEffect(() => {
    function flushDraft() {
      const snap = draftSnapshotRef.current
      if (!snap.user || !snap.exercises?.length || !hasDraftContent(snap.exercises)) return
      saveRecordDraft(snap.user, {
        date: snap.date,
        type: snap.type,
        exercises: snap.exercises,
      })
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') flushDraft()
    }

    window.addEventListener('pagehide', flushDraft)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      flushDraft()
      window.removeEventListener('pagehide', flushDraft)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const routineOptions = (settings?.routineOrder || []).map((name) => ({ value: name, label: name }))

  function updateExercise(index, patch) {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)))
  }

  function changeSetsCount(index, count) {
    const n = Math.min(10, Math.max(1, count || 1))
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex
        const next = Array.from({ length: n }, (_, si) => ({
          weight: ex.setsDetail?.[si]?.weight ?? null,
          reps: ex.setsDetail?.[si]?.reps ?? null,
        }))
        return { ...ex, setsCount: n, setsDetail: next }
      }),
    )
  }

  function reorderExercises(fromIndex, toIndex) {
    if (fromIndex === toIndex) return
    setExercises((prev) => {
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
  }

  function handleDragStart(index) {
    setDragIndex(index)
  }

  function handleDragOver(e, index) {
    e.preventDefault()
    setDragOverIndex(index)
  }

  function handleDrop(e, index) {
    e.preventDefault()
    if (dragIndex != null) reorderExercises(dragIndex, index)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleHandlePointerDown(e, index) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    touchDragRef.current = { index, pointerId: e.pointerId }
    setDragIndex(index)
  }

  function handleHandlePointerMove(e) {
    const active = touchDragRef.current
    if (!active || active.pointerId !== e.pointerId) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const card = el?.closest('[data-exercise-index]')
    if (card) {
      setDragOverIndex(Number(card.dataset.exerciseIndex))
    }
  }

  function handleHandlePointerUp(e) {
    const active = touchDragRef.current
    if (!active || active.pointerId !== e.pointerId) return
    if (dragOverIndex != null && active.index !== dragOverIndex) {
      reorderExercises(active.index, dragOverIndex)
    }
    touchDragRef.current = null
    setDragIndex(null)
    setDragOverIndex(null)
  }

  function handleTypeChange(nextType) {
    setDraftStatus('dismissed')
    setType(nextType)
  }

  function handleDateChange(nextDate) {
    setDate(nextDate)
  }

  function addExercise() {
    const all = settings?.exercises[type] || []
    const current = exercises.map((e) => e.name)
    const available = all.filter((n) => !current.includes(n))
    if (available.length === 0) {
      message.warning('추가할 수 있는 운동이 없습니다.')
      return
    }
    let selected = available[0]
    Modal.confirm({
      title: '운동 추가',
      content: (
        <Select
          style={{ width: '100%', marginTop: 12 }}
          defaultValue={available[0]}
          options={available.map((n) => ({ value: n, label: n }))}
          onChange={(v) => {
            selected = v
          }}
        />
      ),
      okText: '추가',
      cancelText: '취소',
      onOk: () => setExercises((prev) => [...prev, emptyExercise(selected)]),
    })
  }

  function handleDraftSave() {
    if (exercises.length === 0) {
      message.warning('저장할 운동이 없습니다.')
      return
    }
    setDraftSaving(true)
    try {
      const savedAt = saveRecordDraft(user, { date, type, exercises })
      setDraftSavedAt(savedAt)
      message.success('임시저장되었습니다. 나중에 이어서 작성할 수 있어요.')
    } finally {
      setDraftSaving(false)
    }
  }

  async function handleSave() {
    const result = serializeExercises(exercises)
    if (result.error) {
      message.warning(result.error)
      return
    }

    setSaving(true)
    try {
      await addWorkout(user, { date, type, exercises: result.exercises })
      clearRecordDraft(user)
      setDraftSavedAt(null)
      message.success('운동 기록이 Firebase에 저장되었습니다!')
      navigate('/')
    } catch (err) {
      modal.error({ title: '저장 실패', content: err.message })
    } finally {
      setSaving(false)
    }
  }

  function handleLoadLastWorkout() {
    const last = getLastWorkoutByType(allWorkouts, type)
    if (!last?.exercises?.length) {
      message.info('이 루틴의 이전 기록이 없습니다.')
      return
    }
    modal.confirm({
      title: '지난번 기록 불러오기',
      content: `${last.date} · ${last.type} 기록을 그대로 가져올까요?`,
      okText: '불러오기',
      cancelText: '취소',
      onOk: () => {
        setExercises(last.exercises.map(exerciseFromSaved))
        setDraftStatus('restored')
        message.success('지난번 기록을 불러왔습니다.')
      },
    })
  }

  const personalBests = getPersonalBests(allWorkouts)
  const completion = getCompletionRate(exercises)
  const lastWorkoutForType = getLastWorkoutByType(allWorkouts, type)

  function clearDraft() {
    modal.confirm({
      title: '임시저장을 삭제할까요?',
      okText: '삭제',
      cancelText: '취소',
      okButtonProps: { danger: true },
      onOk: () => {
        clearRecordDraft(user)
        setDraftSavedAt(null)
        message.success('임시저장이 삭제되었습니다.')
      },
    })
  }

  const draftTimeLabel = formatDraftTime(draftSavedAt)
  const canDraftSave = exercises.length > 0

  return (
    <>
      <PageHeader
        title="운동 기록"
        actions={
          <Link to="/">
            <Button>돌아가기</Button>
          </Link>
        }
      />
      <main className="container">
        <Card title="오늘의 운동">
          {draftTimeLabel && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`임시저장됨 · ${draftTimeLabel}`}
              description="입력 중 자동 저장됩니다. Firebase 저장 전까지 이 기기에 보관돼요."
              action={
                <Button size="small" danger type="text" onClick={clearDraft}>
                  삭제
                </Button>
              }
            />
          )}
          <Form layout="vertical">
            <Form.Item label="운동 날짜">
              <DateField value={date} onChange={handleDateChange} />
            </Form.Item>
            <Form.Item label="운동 루틴">
              <Select
                size="large"
                value={type || undefined}
                options={routineOptions}
                onChange={handleTypeChange}
                style={{ width: '100%' }}
              />
            </Form.Item>
            {lastWorkoutForType && (
              <Button
                block
                icon={<HistoryOutlined />}
                style={{ marginBottom: 16 }}
                onClick={handleLoadLastWorkout}
              >
                지난번이랑 똑같이 ({lastWorkoutForType.date})
              </Button>
            )}
          </Form>

          {exercises.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  입력 진행 {completion.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {completion.percent}%
                </Text>
              </Flex>
              <Progress percent={completion.percent} showInfo={false} size="small" />
            </div>
          )}

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {exercises.map((ex, index) => {
              const ph = placeholders[ex.name] || {}
              const prev = findPreviousExercise(allWorkouts, type, ex.name)
              const pr = checkPersonalBest(ex.name, ex, personalBests)
              const filled = isExerciseFilled(ex)
              const cardClass = [
                'exercise-card-draggable',
                dragIndex === index ? 'dragging' : '',
                dragOverIndex === index && dragIndex !== index ? 'drag-over' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <Card
                  key={`${ex.name}-${index}`}
                  size="small"
                  className={cardClass}
                  data-exercise-index={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  title={
                    <Flex align="center" gap={8}>
                      <span
                        className="drag-handle"
                        role="button"
                        aria-label="순서 변경"
                        onPointerDown={(e) => handleHandlePointerDown(e, index)}
                        onPointerMove={handleHandlePointerMove}
                        onPointerUp={handleHandlePointerUp}
                        onPointerCancel={handleHandlePointerUp}
                      >
                        <HolderOutlined />
                      </span>
                      <span>{ex.name}</span>
                      <ExerciseDoneBadge filled={filled} />
                      <PersonalBestBadge pr={pr} />
                    </Flex>
                  }
                  extra={
                    <Space>
                      <Segmented
                        size="small"
                        value={ex.mode}
                        options={[
                          { label: '간편', value: 'simple' },
                          { label: '상세', value: 'detailed' },
                        ]}
                        onChange={(mode) => updateExercise(index, { mode })}
                      />
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
                      />
                    </Space>
                  }
                >
                  {ex.mode === 'simple' ? (
                    <>
                      <SimpleExerciseInputs
                        ex={ex}
                        ph={ph}
                        index={index}
                        updateExercise={updateExercise}
                      />
                      {prev && (
                        <ExerciseCompareHint current={ex} previous={prev.exercise} />
                      )}
                    </>
                  ) : (
                    <>
                      <Form.Item label="세트 수" style={{ marginBottom: 12 }}>
                        <InputNumber
                          min={1}
                          max={10}
                          value={ex.setsCount}
                          onChange={(v) => changeSetsCount(index, v)}
                        />
                      </Form.Item>
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {(ex.setsDetail || []).map((set, si) => (
                          <Flex key={si} gap={8} align="end">
                            <Text style={{ width: 48 }}>{si + 1}세트</Text>
                            <InputNumber
                              style={{ flex: 1 }}
                              step={0.5}
                              precision={1}
                              placeholder="무게"
                              value={set.weight}
                              onChange={(v) => {
                                const next = [...ex.setsDetail]
                                next[si] = { ...next[si], weight: v }
                                updateExercise(index, { setsDetail: next })
                              }}
                            />
                            <InputNumber
                              style={{ flex: 1 }}
                              placeholder="회"
                              value={set.reps}
                              onChange={(v) => {
                                const next = [...ex.setsDetail]
                                next[si] = { ...next[si], reps: v }
                                updateExercise(index, { setsDetail: next })
                              }}
                            />
                            {si < ex.setsDetail.length - 1 && (
                              <Button
                                onClick={() => {
                                  const next = [...ex.setsDetail]
                                  next[si + 1] = {
                                    weight: next[si].weight,
                                    reps: next[si].reps,
                                  }
                                  updateExercise(index, { setsDetail: next })
                                }}
                              >
                                ↓
                              </Button>
                            )}
                          </Flex>
                        ))}
                      </Space>
                      {prev && (
                        <ExerciseCompareHint current={ex} previous={prev.exercise} />
                      )}
                    </>
                  )}
                  <Form.Item label="코멘트" style={{ marginTop: 12, marginBottom: 0 }}>
                    <Input
                      placeholder="예: 자세 좋음, 드랍세트"
                      value={ex.comment}
                      onChange={(e) => updateExercise(index, { comment: e.target.value })}
                    />
                  </Form.Item>
                </Card>
              )
            })}

            <Button type="dashed" block icon={<PlusOutlined />} onClick={addExercise}>
              운동 추가
            </Button>

            <Flex gap={8} vertical={false} style={{ width: '100%' }}>
              <Button
                block
                icon={<SaveOutlined />}
                loading={draftSaving}
                disabled={!canDraftSave}
                onClick={handleDraftSave}
              >
                임시저장
              </Button>
              <Button type="primary" block loading={saving} onClick={handleSave}>
                Firebase 저장
              </Button>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
              임시저장은 이 기기에만 보관 · Firebase 저장 시 최종 반영
            </Text>
          </Space>
        </Card>
      </main>
    </>
  )
}
