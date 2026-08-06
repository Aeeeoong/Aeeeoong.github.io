import { useEffect, useMemo, useState } from 'react'
import {
  App,
  Button,
  Card,
  Drawer,
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
import CardioExerciseInputs from './CardioExerciseInputs'
import DateField from './DateField'
import {
  emptyExercise,
  exerciseFromSaved,
  serializeExercises,
} from '../lib/workoutForm'
import { getExerciseProfile, inputNumberPropsForProfile, isCardioProfile } from '../lib/exerciseConfig'
import {
  defaultAddableExercise,
  getAddableExerciseNames,
  getAddableExerciseOptions,
  isFreeRoutine,
} from '../lib/routines'
import { updateWorkout } from '../services/storage'

const { Text } = Typography

export default function EditWorkoutDrawer({ open, workout, settings, user, onClose, onSaved }) {
  const { message, modal } = App.useApp()
  const [date, setDate] = useState('')
  const [type, setType] = useState('')
  const [exercises, setExercises] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !workout) return
    setDate(workout.date)
    setType(workout.type)
    setExercises((workout.exercises || []).map((ex) => exerciseFromSaved(ex, settings)))
  }, [open, workout, settings])

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

  function handleTypeChange(nextType) {
    setType(nextType)
    if (isFreeRoutine(nextType)) {
      setExercises([])
      return
    }
    const names = settings?.exercises?.[nextType] || []
    setExercises((prev) => {
      const byName = Object.fromEntries(prev.map((ex) => [ex.name, ex]))
      if (names.length === 0) return prev
      return names.map((name) => byName[name] || emptyExercise(name, settings))
    })
  }

  function addExercise() {
    const current = exercises.map((e) => e.name)
    const available = getAddableExerciseNames(settings, type, current)
    if (available.length === 0) {
      message.warning(
        isFreeRoutine(type)
          ? '추가할 수 있는 운동이 없습니다. (모든 기구가 이미 추가됨)'
          : '추가할 수 있는 운동이 없습니다.',
      )
      return
    }
    const options = getAddableExerciseOptions(settings, type, current)
    let selected = defaultAddableExercise(settings, type, current)
    Modal.confirm({
      title: isFreeRoutine(type) ? '운동 추가 (전체 기구)' : '운동 추가',
      content: (
        <Select
          style={{ width: '100%', marginTop: 12 }}
          defaultValue={selected}
          options={options}
          onChange={(v) => {
            selected = v
          }}
        />
      ),
      okText: '추가',
      cancelText: '취소',
      onOk: () => setExercises((prev) => [...prev, emptyExercise(selected, settings)]),
    })
  }

  async function handleSave() {
    const result = serializeExercises(exercises, settings)
    if (result.error) {
      message.warning(result.error)
      return
    }

    setSaving(true)
    try {
      await updateWorkout(user, {
        ...workout,
        date,
        type,
        exercises: result.exercises,
      })
      message.success('기록이 수정되었습니다.')
      onSaved?.()
      onClose?.()
    } catch (err) {
      modal.error({ title: '수정 실패', content: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="운동 기록 수정"
      open={open}
      onClose={onClose}
      width="min(100%, 520px)"
      destroyOnHidden
      extra={
        <Button type="primary" loading={saving} onClick={handleSave}>
          저장
        </Button>
      }
    >
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
          const profile = getExerciseProfile(ex.name, settings)
          const isCardio = ex.mode === 'cardio' || isCardioProfile(profile)
          return (
          <Card
            key={`${ex.name}-${index}`}
            size="small"
            title={ex.name}
            extra={
              <Space>
                {!isCardio && (
                  <Segmented
                    size="small"
                    value={ex.mode}
                    options={[
                      { label: '간편', value: 'simple' },
                      { label: '상세', value: 'detailed' },
                    ]}
                    onChange={(mode) => updateExercise(index, { mode })}
                  />
                )}
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setExercises((prev) => prev.filter((_, i) => i !== index))}
                />
              </Space>
            }
          >
            {isCardio ? (
              <CardioExerciseInputs
                ex={ex}
                ph={{}}
                index={index}
                updateExercise={updateExercise}
                profile={profile}
              />
            ) : ex.mode === 'simple' ? (
              <div className="simple-exercise-inputs">
                <Form.Item label={profile.inputLabel} className="field-weight" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: '100%' }}
                    {...inputNumberPropsForProfile(profile)}
                    value={ex.weight}
                    onChange={(v) => updateExercise(index, { weight: v })}
                  />
                </Form.Item>
                <Form.Item label="회" className="field-reps" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: '100%' }}
                    controls={false}
                    value={ex.reps}
                    onChange={(v) => updateExercise(index, { reps: v })}
                  />
                </Form.Item>
                <Form.Item label="세트" className="field-sets" style={{ marginBottom: 8 }}>
                  <InputNumber
                    style={{ width: '100%' }}
                    controls={false}
                    value={ex.sets}
                    onChange={(v) => updateExercise(index, { sets: v })}
                  />
                </Form.Item>
              </div>
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
                        {...inputNumberPropsForProfile(profile)}
                        placeholder={profile.inputLabel}
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
          수정 저장
        </Button>
      </Space>
    </Drawer>
  )
}
