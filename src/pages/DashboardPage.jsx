import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Space,
  Spin,
  Statistic,
  Typography,
} from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { getLatestInbody, getInbodyRecords, getWorkouts } from '../services/storage'
import {
  calculateStreak,
  formatWeekRangeLabel,
  getWeeklySummary,
} from '../lib/workoutInsights'
import { displayDate, formatNumber } from '../lib/utils'

const { Text, Paragraph } = Typography

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { modal } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [latestInbody, setLatestInbody] = useState(null)
  const [recent, setRecent] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [inbodyRecords, setInbodyRecords] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [inbody, all, records] = await Promise.all([
          getLatestInbody(user),
          getWorkouts(user),
          getInbodyRecords(user, 20),
        ])
        if (cancelled) return
        setLatestInbody(inbody)
        setWorkouts(all)
        setInbodyRecords(records)
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

  const streak = useMemo(() => calculateStreak(workouts), [workouts])
  const weekly = useMemo(() => getWeeklySummary(workouts, inbodyRecords), [workouts, inbodyRecords])

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
            <Card size="small" className="summary-card dashboard-streak-card" style={{ marginBottom: 16 }}>
              <Flex justify="space-between" align="center" wrap="gap">
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {streak.message}
                  </Text>
                  {streak.longest > 1 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        최장 {streak.longest}일 연속
                      </Text>
                    </div>
                  )}
                </div>
                <Row gutter={[12, 16]} style={{ flex: 1, minWidth: 200 }}>
                  <Col xs={12} sm={6}>
                    <Statistic title="총 운동" value={workouts.length} />
                  </Col>
                  <Col xs={12} sm={6}>
                    <Statistic
                      title="7일"
                      value={workouts.filter((w) => {
                        const d = new Date()
                        d.setDate(d.getDate() - 7)
                        return new Date(w.date) >= d
                      }).length}
                    />
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
              </Flex>
            </Card>

            <Card
              title="이번 주 요약"
              className="dashboard-weekly-card"
              style={{ marginBottom: 16 }}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatWeekRangeLabel(weekly.weekStart, weekly.weekEnd)}
                </Text>
              }
            >
              <Paragraph style={{ marginBottom: 8 }}>{weekly.encouragement}</Paragraph>
              <Space direction="vertical" size={4}>
                {weekly.lines.map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
                {weekly.lines.length === 0 && (
                  <Text type="secondary">이번 주 첫 운동을 기록해보세요!</Text>
                )}
              </Space>
            </Card>

            <Card title="운동 달력" style={{ marginBottom: 16 }} className="dashboard-calendar-card">
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
                  const key = current.format('YYYY-MM-DD')
                  const dayWorkouts = byDate[key]
                  return (
                    <div
                      style={{
                        minHeight: 24,
                        cursor: dayWorkouts?.length ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (!dayWorkouts?.length) return
                        navigate(`/history?date=${key}`)
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
              className="dashboard-recent-card"
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
                    <List.Item
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/history?date=${workout.date}`)}
                    >
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
