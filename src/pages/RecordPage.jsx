import { useEffect, useMemo, useState } from 'react'
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
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import DateField from '../components/DateField'
import { useAuth } from '../context/AuthContext'
import { addWorkout, getSettings, getWorkouts } from '../services/storage'
import { getTodayString } from '../lib/utils'

const { Text } = Typography

function emptyExercise(name) {
  return {
    name,
    mode: 'simple',
    weight: null,
    sets: null,
    reps: null,
    comment: '',
    setsCount: 3,
    setsDetail: [
      { weight: null, reps: null },
      { weight: null, reps: null },
      { weight: null, reps: null },
    ],
  }
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

  useEffect(() => {
    getSettings(user).then((s) => {
      setSettings(s)
      setType(s.routineOrder[0])
    })
  }, [user])

  useEffect(() => {
    if (!settings || !type) return
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
  }, [settings, type, user])

  const routineOptions = useMemo(
    () => (settings?.routineOrder || []).map((name) => ({ value: name, label: name })),
    [settings],
  )

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
    const workoutExercises = exercises
      .map((ex) => {
        if (ex.mode === 'simple') {
          if (ex.weight != null || ex.sets != null || ex.reps != null || ex.comment) {
            return {
              name: ex.name,
              mode: 'simple',
              weight: ex.weight != null ? Number(ex.weight) : null,
              sets: ex.sets != null ? Number(ex.sets) : null,
              reps: ex.reps != null ? Number(ex.reps) : null,
              comment: ex.comment || '',
            }
          }
          return null
        }
        const setsDetail = (ex.setsDetail || [])
          .map((s, i) => ({
            set: i + 1,
            weight: s.weight != null ? Number(s.weight) : null,
            reps: s.reps != null ? Number(s.reps) : null,
          }))
          .filter((s) => s.weight != null || s.reps != null)

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
      message.warning('최소 1개 이상의 운동을 입력해주세요.')
      return
    }

    setSaving(true)
    try {
      await addWorkout(user, { date, type, exercises: workoutExercises })
      message.success('운동 기록이 Firebase에 저장되었습니다!')
      navigate('/')
    } catch (err) {
      modal.error({ title: '저장 실패', content: err.message })
    } finally {
      setSaving(false)
    }
  }

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
          <Form layout="vertical">
            <Form.Item label="운동 날짜">
              <DateField value={date} onChange={setDate} />
            </Form.Item>
            <Form.Item label="운동 루틴">
              <Select
                size="large"
                value={type || undefined}
                options={routineOptions}
                onChange={setType}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {exercises.map((ex, index) => {
              const ph = placeholders[ex.name] || {}
              return (
                <Card
                  key={`${ex.name}-${index}`}
                  size="small"
                  title={ex.name}
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
                    <Flex gap={8} wrap="wrap">
                      <Form.Item label="무게 (kg)" style={{ marginBottom: 8, flex: 1, minWidth: 100 }}>
                        <InputNumber
                          style={{ width: '100%' }}
                          step={0.5}
                          placeholder={ph.weight != null ? String(ph.weight) : '0'}
                          value={ex.weight}
                          onChange={(v) => updateExercise(index, { weight: v })}
                        />
                      </Form.Item>
                      <Form.Item label="세트" style={{ marginBottom: 8, flex: 1, minWidth: 80 }}>
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder={ph.sets != null ? String(ph.sets) : '0'}
                          value={ex.sets}
                          onChange={(v) => updateExercise(index, { sets: v })}
                        />
                      </Form.Item>
                      <Form.Item label="회" style={{ marginBottom: 8, flex: 1, minWidth: 80 }}>
                        <InputNumber
                          style={{ width: '100%' }}
                          placeholder={ph.reps != null ? String(ph.reps) : '0'}
                          value={ex.reps}
                          onChange={(v) => updateExercise(index, { reps: v })}
                        />
                      </Form.Item>
                    </Flex>
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
