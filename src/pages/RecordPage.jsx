import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Typography,
} from 'antd'
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import DateField from '../components/DateField'
import { useAuth } from '../context/AuthContext'
import { addWorkout, getSettings, getWorkouts } from '../services/storage'
import { emptyExercise, serializeExercises } from '../lib/workoutForm'
import {
  clearRecordDraft,
  hasDraftContent,
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
  const [draftChecked, setDraftChecked] = useState(false)
  const [restoredFromDraft, setRestoredFromDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState(null)
  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const touchDragRef = useRef(null)

  useEffect(() => {
    getSettings(user).then((s) => {
      setSettings(s)
      setType(s.routineOrder[0])
    })
  }, [user])

  useEffect(() => {
    if (!settings || draftChecked) return
    setDraftChecked(true)
    const draft = loadRecordDraft(user)
    if (!draft?.exercises?.length || !hasDraftContent(draft.exercises)) return

    modal.confirm({
      title: '임시저장된 기록이 있습니다',
      content: `${draft.date} · ${draft.type} 루틴 — 이어서 작성할까요?`,
      okText: '불러오기',
      cancelText: '새로 시작',
      onOk: () => {
        setDate(draft.date)
        setType(draft.type)
        setExercises(draft.exercises)
        setDraftSavedAt(draft.savedAt)
        setRestoredFromDraft(true)
      },
      onCancel: () => clearRecordDraft(user),
    })
  }, [settings, draftChecked, user, modal])

  useEffect(() => {
    if (!settings || !type || restoredFromDraft) return
    async function setup() {
      const names = settings.exercises[type] || []
      setExercises(names.map((name) => emptyExercise(name)))
      const recent = await getWorkouts(user)
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
  }, [settings, type, user, restoredFromDraft])

  useEffect(() => {
    if (!user || !settings || exercises.length === 0) return
    if (!hasDraftContent(exercises)) return

    const timer = setTimeout(() => {
      saveRecordDraft(user, { date, type, exercises })
      setDraftSavedAt(Date.now())
    }, 600)
    return () => clearTimeout(timer)
  }, [user, settings, date, type, exercises])

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
    setRestoredFromDraft(false)
    setType(nextType)
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

  const draftTimeLabel =
    draftSavedAt &&
    new Date(draftSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

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
            <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
              <Text type="secondary" style={{ fontSize: 13 }}>
                임시저장됨 · {draftTimeLabel}
              </Text>
              <Button type="link" size="small" danger onClick={clearDraft}>
                임시저장 삭제
              </Button>
            </Flex>
          )}
          <Form layout="vertical">
            <Form.Item label="운동 날짜">
              <DateField value={date} onChange={setDate} />
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
          </Form>

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {exercises.map((ex, index) => {
              const ph = placeholders[ex.name] || {}
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
                    <SimpleExerciseInputs
                      ex={ex}
                      ph={ph}
                      index={index}
                      updateExercise={updateExercise}
                    />
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

            <Button type="primary" size="large" block loading={saving} onClick={handleSave}>
              운동 기록 저장하기
            </Button>
          </Space>
        </Card>
      </main>
    </>
  )
}
