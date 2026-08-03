import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  App,
  Badge,
  Button,
  Calendar,
  Card,
  Col,
  Empty,
  Flex,
  List,
  Row,
  Spin,
  Statistic,
  Typography,
} from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getLatestInbody, getWorkoutStats, getWorkouts } from '../services/storage'
import { displayDate, formatNumber } from '../lib/utils'

const { Text } = Typography

export default function DashboardPage() {
  const { user } = useAuth()
  const { modal } = App.useApp()
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
        modal.error({ title: '데이터 로드 실패', content: err.message })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, modal])

  const byDate = useMemo(() => {
    const map = {}
    workouts.forEach((w) => {
      if (!map[w.date]) map[w.date] = []
      map[w.date].push(w)
    })
    return map
  }, [workouts])

  function dateCellRender(current) {
    const key = current.format('YYYY-MM-DD')
    const list = byDate[key]
    if (!list?.length) return null
    return <Badge status="processing" />
  }

  return (
    <>
      <PageHeader
        title="운동 트래커"
        actions={
          <Link to="/record">
            <Button type="primary">기록하기</Button>
          </Link>
        }
      />
      <main className="container">
        {loading ? (
          <div className="loading">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Card size="small" className="summary-card" style={{ marginBottom: 16 }}>
              <Row gutter={[12, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic title="총 운동" value={stats?.totalWorkouts ?? 0} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic title="7일" value={stats?.recentWorkouts ?? 0} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="체중"
                    value={latestInbody ? formatNumber(latestInbody.weight) : '-'}
                    suffix={latestInbody ? 'kg' : ''}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="골격근"
                    value={latestInbody ? formatNumber(latestInbody.muscleMass) : '-'}
                    suffix={latestInbody ? 'kg' : ''}
                  />
                </Col>
              </Row>
            </Card>

            <Card title="운동 달력" style={{ marginBottom: 16 }}>
              <Calendar
                fullscreen={false}
                mode="month"
                headerRender={({ value, onChange }) => (
                  <Flex justify="space-between" align="center" style={{ padding: '4px 0 12px' }}>
                    <Button
                      type="text"
                      icon={<LeftOutlined />}
                      onClick={() => onChange(value.clone().subtract(1, 'month'))}
                    />
                    <Text strong>
                      {value.year()}년 {value.month() + 1}월
                    </Text>
                    <Button
                      type="text"
                      icon={<RightOutlined />}
                      onClick={() => onChange(value.clone().add(1, 'month'))}
                    />
                  </Flex>
                )}
                cellRender={(current, info) => {
                  if (info.type !== 'date') return info.originNode
                  return (
                    <div
                      style={{ minHeight: 24, cursor: byDate[current.format('YYYY-MM-DD')] ? 'pointer' : 'default' }}
                      onClick={() => {
                        const key = current.format('YYYY-MM-DD')
                        const dayWorkouts = byDate[key]
                        if (!dayWorkouts?.[0]) return
                        const w = dayWorkouts[0]
                        modal.info({
                          title: key,
                          content: `${w.type} 운동 · ${w.exercises?.length || 0}개 완료`,
                        })
                      }}
                    >
                      {dateCellRender(current)}
                    </div>
                  )
                }}
              />
            </Card>

            <Card
              title="최근 운동 기록"
              extra={
                <Link to="/history">
                  <Button type="link">전체보기</Button>
                </Link>
              }
            >
              {recent.length === 0 ? (
                <Empty description="아직 운동 기록이 없습니다">
                  <Link to="/record">
                    <Button type="primary">첫 운동 기록하기</Button>
                  </Link>
                </Empty>
              ) : (
                <List
                  dataSource={recent}
                  renderItem={(workout) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            {displayDate(workout.date)}{' '}
                            <Text type="secondary">· {workout.type}</Text>
                          </span>
                        }
                        description={`${workout.exercises?.length || 0}개 운동`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </>
        )}
      </main>
    </>
  )
}
