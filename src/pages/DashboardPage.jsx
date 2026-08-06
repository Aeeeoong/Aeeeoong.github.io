import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Calendar,
  Card,
  Col,
  Empty,
  Flex,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import OnboardingModal from '../components/OnboardingModal'
import { useAuth } from '../context/AuthContext'
import {
  getLatestInbody,
  getInbodyRecords,
  getPartnerSummary,
  getRecentWorkouts,
  getSettings,
  getWorkoutsForMonth,
} from '../services/storage'
import {
  formatWeekRangeLabel,
  getDashboardHighlights,
  getMotivationBanner,
  getWeeklySummary,
  getWorkoutSessionHighlight,
} from '../lib/workoutInsights'
import { formatPersonalBestValue } from '../lib/exerciseConfig'
import { displayDate, formatNumber, getRelativeTime } from '../lib/utils'
import { hasSeenOnboarding } from '../lib/onboarding'
import dayjs from '../lib/dayjsConfig'

const { Text, Paragraph } = Typography

export default function DashboardPage() {
  const { user, knownUsers } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { modal } = App.useApp()
  const [loading, setLoading] = useState(true)
  const [latestInbody, setLatestInbody] = useState(null)
  const [recent, setRecent] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [inbodyRecords, setInbodyRecords] = useState([])
  const [settings, setSettings] = useState(null)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [partnerSummary, setPartnerSummary] = useState(null)
  const [calendarWorkouts, setCalendarWorkouts] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(() => dayjs().startOf('month'))

  function shiftCalendarMonth(base, deltaMonths) {
    setCalendarMonth(base.add(deltaMonths, 'month').startOf('month'))
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const partnerName = knownUsers.find((name) => name !== user)
        const [inbody, all, records, s, partner] = await Promise.all([
          getLatestInbody(user),
          getRecentWorkouts(user, 100),
          getInbodyRecords(user, 20),
          getSettings(user),
          partnerName ? getPartnerSummary(partnerName) : Promise.resolve(null),
        ])
        if (cancelled) return
        setLatestInbody(inbody)
        setWorkouts(all)
        setInbodyRecords(records)
        setSettings(s)
        setPartnerSummary(partner)
        setRecent(all.slice(0, 3))
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
  }, [user, knownUsers, modal])

  useEffect(() => {
    if (!user) return
    getWorkoutsForMonth(user, calendarMonth.year(), calendarMonth.month() + 1)
      .then(setCalendarWorkouts)
      .catch(() => setCalendarWorkouts([]))
  }, [user, calendarMonth])

  useEffect(() => {
    if (loading || !user) return
    if (location.state?.showOnboarding) {
      setOnboardingOpen(true)
      navigate('/', { replace: true, state: {} })
      return
    }
    if (!hasSeenOnboarding(user)) {
      setOnboardingOpen(true)
    }
  }, [loading, user, location.state, navigate])

  const byDate = useMemo(() => {
    const map = {}
    const seen = new Set()
    ;[...workouts, ...calendarWorkouts].forEach((w) => {
      if (seen.has(w.id)) return
      seen.add(w.id)
      if (!map[w.date]) map[w.date] = []
      map[w.date].push(w)
    })
    return map
  }, [workouts, calendarWorkouts])

  const banner = useMemo(() => getMotivationBanner(workouts), [workouts])
  const highlights = useMemo(() => getDashboardHighlights(workouts, settings), [workouts, settings])
  const weekly = useMemo(
    () => getWeeklySummary(workouts, inbodyRecords, settings),
    [workouts, inbodyRecords, settings],
  )

  function renderWorkoutDot(current) {
    const key = current.format('YYYY-MM-DD')
    const hasWorkout = !!byDate[key]?.length
    return (
      <span
        className={`calendar-workout-dot${hasWorkout ? ' has-workout' : ''}`}
        aria-hidden
      />
    )
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
            <div className="dashboard-streak-banner">
              <div className="dashboard-streak-main">{banner.main}</div>
              {banner.sub && <div className="dashboard-streak-sub">{banner.sub}</div>}
            </div>

            <Card size="small" className="summary-card" style={{ marginBottom: 16 }}>
              <Row gutter={[12, 16]}>
                <Col xs={12} sm={6}>
                  <Statistic title="총 운동" value={workouts.length} />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic title="이번 주" value={weekly.workoutCount} suffix="회" />
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

            <Card size="small" className="dashboard-highlights-card" style={{ marginBottom: 16 }}>
              <Row gutter={[12, 12]} align="middle">
                <Col xs={24} sm={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    이번 주 목표 ({highlights.weekCount}/{highlights.weekGoal}회)
                  </Text>
                  <Progress percent={highlights.weekProgress} size="small" style={{ marginTop: 4 }} />
                  {highlights.lastRoutineLine && (
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
                      {highlights.lastRoutineLine}
                    </Text>
                  )}
                </Col>
                <Col xs={24} sm={12}>
                  {highlights.recentPrs.length > 0 ? (
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        최근 PR
                      </Text>
                      {highlights.recentPrs.map((pr) => (
                        <Tag key={pr.name} color="gold">
                          {pr.name}{' '}
                          {formatPersonalBestValue(pr.value, pr.profile)} · {displayDate(pr.date)}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      PR 기록을 쌓아보세요
                    </Text>
                  )}
                </Col>
              </Row>
            </Card>

            {partnerSummary && (
              <Card
                size="small"
                className="dashboard-partner-card"
                title={`${partnerSummary.username} 요약`}
                style={{ marginBottom: 16 }}
              >
                <Space direction="vertical" size={4}>
                  <Text>이번 주 {partnerSummary.weekCount}회 운동</Text>
                  {partnerSummary.lastWorkout ? (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      마지막: {displayDate(partnerSummary.lastWorkout.date)} ·{' '}
                      {partnerSummary.lastWorkout.type} ({partnerSummary.lastWorkout.exerciseCount}개)
                      {' · '}
                      {getRelativeTime(partnerSummary.lastWorkout.date)}
                    </Text>
                  ) : (
                    <Text type="secondary">아직 기록이 없어요</Text>
                  )}
                </Space>
              </Card>
            )}

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
                value={calendarMonth}
                onPanelChange={(date) => setCalendarMonth(date.startOf('month'))}
                headerRender={({ value }) => (
                  <Flex justify="space-between" align="center" style={{ padding: '4px 0 12px' }}>
                    <Button
                      type="text"
                      icon={<LeftOutlined />}
                      onClick={() => shiftCalendarMonth(value, -1)}
                    />
                    <Text strong>
                      {value.year()}년 {value.month() + 1}월
                    </Text>
                    <Button
                      type="text"
                      icon={<RightOutlined />}
                      onClick={() => shiftCalendarMonth(value, 1)}
                    />
                  </Flex>
                )}
                cellRender={(current, info) => {
                  if (info.type !== 'date') return info.originNode
                  const key = current.format('YYYY-MM-DD')
                  const dayWorkouts = byDate[key]
                  return (
                    <div
                      className={`dashboard-calendar-cell-extra${dayWorkouts?.length ? ' is-workout-day' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!dayWorkouts?.length) return
                        navigate(`/history?date=${key}`)
                      }}
                    >
                      {renderWorkoutDot(current)}
                    </div>
                  )
                }}
              />
            </Card>

            <Card
              title="최근 하이라이트"
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
                  renderItem={(workout) => {
                    const session = getWorkoutSessionHighlight(workout, workouts, settings)
                    return (
                      <List.Item
                        className="dashboard-recent-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/history?date=${workout.date}`)}
                      >
                        <List.Item.Meta
                          title={
                            <span>
                              {displayDate(workout.date)}{' '}
                              <Text type="secondary">· {workout.type}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {' '}
                                ({getRelativeTime(workout.date)})
                              </Text>
                            </span>
                          }
                          description={
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                              <Text style={{ fontSize: 13 }}>{session.highlight}</Text>
                              {session.tags.length > 0 && (
                                <Space size={4} wrap>
                                  {session.tags.map((tag) => (
                                    <Tag key={tag.key} color={tag.color} style={{ margin: 0 }}>
                                      {tag.label}
                                    </Tag>
                                  ))}
                                </Space>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </>
        )}
      </main>
      <OnboardingModal
        open={onboardingOpen}
        username={user}
        onClose={() => setOnboardingOpen(false)}
      />
    </>
  )
}
