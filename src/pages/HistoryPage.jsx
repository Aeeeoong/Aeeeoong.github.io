import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  App,
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import EditWorkoutDrawer from '../components/EditWorkoutDrawer'
import { useAuth } from '../context/AuthContext'
import { deleteWorkout, getSettings, getWorkouts } from '../services/storage'
import { displayDate, getRelativeTime } from '../lib/utils'
import { formatCardioSummary, getExerciseProfile, isCardioProfile } from '../lib/exerciseConfig'

const { Text } = Typography

export default function HistoryPage() {
  const { user } = useAuth()
  const { message, modal } = App.useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateFilter = searchParams.get('date') || ''
  const [filter, setFilter] = useState('')
  const [routines, setRoutines] = useState([])
  const [settings, setSettings] = useState(null)
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  async function load(type = filter) {
    setLoading(true)
    try {
      const list = await getWorkouts(user, type ? { type } : {})
      setWorkouts(list)
    } catch (err) {
      modal.error({ title: '로드 실패', content: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getSettings(user).then((s) => {
      setSettings(s)
      setRoutines(s.routineOrder || [])
    })
  }, [user])

  useEffect(() => {
    load(filter)
  }, [user, filter])

  const filteredWorkouts = useMemo(() => {
    if (!dateFilter) return workouts
    return workouts.filter((w) => w.date === dateFilter)
  }, [workouts, dateFilter])

  async function handleDelete(id) {
    try {
      await deleteWorkout(user, id)
      message.success('삭제되었습니다.')
      await load(filter)
    } catch (err) {
      modal.error({ title: '삭제 실패', content: err.message })
    }
  }

  function clearDateFilter() {
    searchParams.delete('date')
    setSearchParams(searchParams)
  }

  return (
    <>
      <PageHeader title="운동 내역" />
      <main className="container">
        {dateFilter && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${displayDate(dateFilter)} 기록만 보는 중`}
            action={
              <Button size="small" type="link" onClick={clearDateFilter}>
                전체 보기
              </Button>
            }
          />
        )}

        <Card style={{ marginBottom: 16 }}>
          <Select
            style={{ width: '100%' }}
            size="large"
            value={filter}
            onChange={setFilter}
            options={[
              { value: '', label: '전체 루틴' },
              ...routines.map((name) => ({ value: name, label: name })),
            ]}
          />
        </Card>

        {loading ? (
          <div className="loading">
            <Spin size="large" />
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <Card>
            <Empty
              description={
                dateFilter ? `${displayDate(dateFilter)} 운동 기록이 없습니다` : '운동 기록이 없습니다'
              }
            >
              <Link to="/record">
                <Button type="primary">운동 기록하기</Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {filteredWorkouts.map((workout) => (
              <Card
                key={workout.id}
                title={
                  <Space wrap>
                    <span>
                      {displayDate(workout.date)}{' '}
                      <Text type="secondary">({getRelativeTime(workout.date)})</Text>
                    </span>
                    <Tag color="purple">{workout.type}</Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setEditing(workout)}
                    >
                      수정
                    </Button>
                    <Popconfirm
                      title="이 운동 기록을 삭제할까요?"
                      okText="삭제"
                      cancelText="취소"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => handleDelete(workout.id)}
                    >
                      <Button danger size="small">
                        삭제
                      </Button>
                    </Popconfirm>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  {(workout.exercises || []).map((ex, idx) => {
                    const profile = getExerciseProfile(ex.name, settings)
                    const isCardio = ex.mode === 'cardio' || isCardioProfile(profile)
                    const isDetailed = !isCardio && ex.mode === 'detailed' && ex.setsDetail?.length
                    return (
                      <Card
                        key={`${ex.name}-${idx}`}
                        size="small"
                        type="inner"
                        title={ex.name}
                        extra={isDetailed ? <Tag>상세</Tag> : isCardio ? <Tag color="cyan">유산소</Tag> : null}
                      >
                        {isCardio ? (
                          <Text type="secondary">{formatCardioSummary(ex.cardio, profile)}</Text>
                        ) : isDetailed ? (
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {ex.setsDetail.map((set) => (
                              <FlexRow
                                key={set.set}
                                label={`${set.set}세트`}
                                value={`${set.weight ? `${set.weight}kg` : '-'} × ${set.reps ? `${set.reps}회` : '-'}`}
                              />
                            ))}
                          </Space>
                        ) : (
                          <Text type="secondary">
                            {ex.weight ? `${ex.weight}kg ` : ''}
                            {ex.sets ? `${ex.sets} 세트 ` : ''}
                            {ex.reps ? `${ex.reps}회` : ''}
                          </Text>
                        )}
                        {ex.comment && (
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary" italic>
                              {ex.comment}
                            </Text>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </main>

      <EditWorkoutDrawer
        open={!!editing}
        workout={editing}
        settings={settings}
        user={user}
        onClose={() => setEditing(null)}
        onSaved={() => load(filter)}
      />
    </>
  )
}

function FlexRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Text type="secondary">{label}</Text>
      <Text>{value}</Text>
    </div>
  )
}
