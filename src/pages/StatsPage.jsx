import { useEffect, useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { Card, Col, Empty, Form, Row, Segmented, Select, Statistic, Typography } from 'antd'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import {
  getExerciseProgress,
  getInbodyRecords,
  getSettings,
  getWorkouts,
} from '../services/storage'
import {
  formatExerciseValue,
  getExerciseProfile,
  personalBestLabel,
} from '../lib/exerciseConfig'
import {
  getExerciseSummary,
  getPersonalBests,
  getWorkoutDateSet,
} from '../lib/workoutInsights'
import { displayDate, formatNumber } from '../lib/utils'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

const { Text } = Typography

function calcYRange(data) {
  const values = data.filter((v) => v != null)
  if (values.length === 0) return { min: 0, max: 100 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const padding = range * 0.1 || 1
  return {
    min: Math.floor((min - padding) * 10) / 10,
    max: Math.ceil((max + padding) * 10) / 10,
  }
}

export default function StatsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('weight')
  const [inbody, setInbody] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [settings, setSettings] = useState(null)
  const [routine, setRoutine] = useState('')
  const [exercise, setExercise] = useState('')
  const [progress, setProgress] = useState([])

  useEffect(() => {
    Promise.all([getInbodyRecords(user), getWorkouts(user), getSettings(user)]).then(
      ([records, allWorkouts, conf]) => {
        setInbody([...records].reverse())
        setWorkouts(allWorkouts)
        setSettings(conf)
        const firstRoutine = conf.routineOrder[0]
        setRoutine(firstRoutine)
        setExercise(conf.exercises[firstRoutine]?.[0] || '')
      },
    )
  }, [user])

  useEffect(() => {
    if (!exercise) return
    getExerciseProgress(user, exercise).then(setProgress)
  }, [user, exercise])

  const exerciseOptions = useMemo(
    () => (settings && routine ? settings.exercises[routine] || [] : []),
    [settings, routine],
  )

  const workoutDates = useMemo(() => getWorkoutDateSet(workouts), [workouts])
  const personalBests = useMemo(() => getPersonalBests(workouts, settings), [workouts, settings])
  const exerciseProfile = useMemo(
    () => (exercise && settings ? getExerciseProfile(exercise, settings) : null),
    [exercise, settings],
  )
  const exerciseSummary = useMemo(
    () => getExerciseSummary(progress, exercise, personalBests, exerciseProfile),
    [progress, exercise, personalBests, exerciseProfile],
  )

  const topPersonalBests = useMemo(() => {
    return Object.entries(personalBests)
      .filter(([, b]) => b.bestValue != null)
      .sort((a, b) => {
        if (a[1].better === 'lower') return a[1].bestValue - b[1].bestValue
        return b[1].bestValue - a[1].bestValue
      })
      .slice(0, 8)
  }, [personalBests])

  const inbodyChart = useMemo(() => {
    if (inbody.length === 0) return null
    const labels = inbody.map((r) => {
      const d = new Date(r.date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    const meta = {
      weight: { data: inbody.map((r) => r.weight), label: '체중 (kg)', border: '#2563eb', fill: 'rgba(37,99,235,0.2)' },
      muscle: { data: inbody.map((r) => r.muscleMass), label: '골격근량 (kg)', border: '#10b981', fill: 'rgba(16,185,129,0.2)' },
      bodyfat: { data: inbody.map((r) => r.bodyFat), label: '체지방률 (%)', border: '#f59e0b', fill: 'rgba(245,158,11,0.2)' },
    }[tab]

    const range = calcYRange(meta.data)
    return {
      data: {
        labels,
        datasets: [
          {
            label: meta.label,
            data: meta.data,
            borderColor: meta.border,
            backgroundColor: meta.fill,
            tension: 0.3,
            fill: true,
            pointRadius: inbody.map((r) => (workoutDates.has(r.date) ? 8 : 5)),
            pointBackgroundColor: inbody.map((r) =>
              workoutDates.has(r.date) ? '#6366f1' : meta.border,
            ),
            pointBorderWidth: inbody.map((r) => (workoutDates.has(r.date) ? 2 : 1)),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: range.min, max: range.max } },
        plugins: {
          tooltip: {
            callbacks: {
              afterLabel(ctx) {
                const record = inbody[ctx.dataIndex]
                if (workoutDates.has(record.date)) return '🏋️ 운동한 날'
                return ''
              },
            },
          },
        },
      },
    }
  }, [inbody, tab, workoutDates])

  const exerciseChart = useMemo(() => {
    if (progress.length === 0) return null
    const labels = progress.map((p) => {
      const d = new Date(p.date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })
    const hasWeight = progress.some((p) => p.weight && p.weight > 0)
    const data = hasWeight ? progress.map((p) => p.weight) : progress.map((p) => p.reps)
    return {
      data: {
        labels,
        datasets: [
          {
            label: hasWeight ? `${exercise} 무게 (kg)` : `${exercise} 회수`,
            data,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    }
  }, [progress, exercise])

  const distribution = useMemo(() => {
    const workoutsByType = {}
    workouts.forEach((w) => {
      workoutsByType[w.type] = (workoutsByType[w.type] || 0) + 1
    })
    const types = Object.keys(workoutsByType)
    if (types.length === 0) return null
    return {
      data: {
        labels: types,
        datasets: [
          {
            data: Object.values(workoutsByType),
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
      },
    }
  }, [workouts])

  return (
    <>
      <PageHeader title="통계" />
      <main className="container">
        <Card
          title="인바디 추이"
          extra={
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { label: '체중', value: 'weight' },
                { label: '골격근', value: 'muscle' },
                { label: '체지방', value: 'bodyfat' },
              ]}
            />
          }
          style={{ marginBottom: 16 }}
        >
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            ● 큰 점 = 운동한 날
          </Text>
          <div className="chart-container">
            {inbodyChart ? (
              <Line data={inbodyChart.data} options={inbodyChart.options} />
            ) : (
              <Empty description="인바디 데이터가 없습니다" />
            )}
          </div>
        </Card>

        <Card title="운동별 기록" style={{ marginBottom: 16 }}>
          <Form layout="vertical">
            <Form.Item label="루틴">
              <Select
                size="large"
                value={routine || undefined}
                options={(settings?.routineOrder || []).map((name) => ({ value: name, label: name }))}
                onChange={(next) => {
                  setRoutine(next)
                  setExercise(settings?.exercises[next]?.[0] || '')
                }}
              />
            </Form.Item>
            <Form.Item label="운동">
              <Select
                size="large"
                value={exercise || undefined}
                options={exerciseOptions.map((name) => ({ value: name, label: name }))}
                onChange={setExercise}
              />
            </Form.Item>
          </Form>

          {exerciseSummary ? (
            <Row gutter={[12, 16]} style={{ marginBottom: 16 }}>
              <Col xs={8}>
                <Statistic
                  title={exerciseSummary.pbLabel || '역대 최고'}
                  value={
                    exerciseProfile?.unit === 'level'
                      ? exerciseSummary.allTimeBest
                      : formatNumber(exerciseSummary.allTimeBest)
                  }
                  suffix={exerciseProfile?.unit === 'level' ? '레벨' : exerciseProfile?.suffix || 'kg'}
                />
              </Col>
              <Col xs={8}>
                <Statistic title="기록 횟수" value={exerciseSummary.totalSessions} suffix="번" />
              </Col>
              <Col xs={8}>
                <Statistic title="총 횟수" value={exerciseSummary.totalReps} suffix="회" />
              </Col>
            </Row>
          ) : (
            <Empty description="선택한 운동의 기록이 없습니다" style={{ marginBottom: 16 }} />
          )}

          <div className="chart-container">
            {exerciseChart ? (
              <Line data={exerciseChart.data} options={exerciseChart.options} />
            ) : (
              <Empty description="차트를 그릴 데이터가 없습니다" />
            )}
          </div>
        </Card>

        <Card title="🏆 기구별 최고 기록" style={{ marginBottom: 16 }}>
          {topPersonalBests.length === 0 ? (
            <Empty description="아직 기록이 없습니다" />
          ) : (
            <Row gutter={[8, 8]}>
              {topPersonalBests.map(([name, best]) => {
                const profile = best.profile || getExerciseProfile(name, settings)
                return (
                  <Col xs={12} sm={8} key={name}>
                    <Card size="small" type="inner">
                      <Text strong>{name}</Text>
                      <div>
                        <Text style={{ fontSize: 18, color: 'var(--primary)' }}>
                          {formatExerciseValue(best.bestValue, profile)}
                        </Text>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {personalBestLabel(profile)}
                        {best.bestDate ? ` · ${displayDate(best.bestDate)}` : ''}
                      </Text>
                    </Card>
                  </Col>
                )
              })}
            </Row>
          )}
        </Card>

        <Card title="루틴별 운동 횟수">
          <div className="chart-container">
            {distribution ? (
              <Doughnut data={distribution.data} options={distribution.options} />
            ) : (
              <Empty description="운동 기록이 없습니다" />
            )}
          </div>
        </Card>
      </main>
    </>
  )
}
