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
  chartValueLabel,
  formatCardioSummary,
  formatExerciseValue,
  getExerciseProfile,
  isCardioProfile,
  personalBestLabel,
  statisticValueSuffix,
  tracksPersonalBest,
  usesIntegerValue,
} from '../lib/exerciseConfig'
import {
  getExerciseSummary,
  getPersonalBests,
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

  const personalBests = useMemo(() => getPersonalBests(workouts, settings), [workouts, settings])
  const exerciseProfile = useMemo(
    () => (exercise && settings ? getExerciseProfile(exercise, settings) : null),
    [exercise, settings],
  )
  const exerciseSummary = useMemo(
    () => getExerciseSummary(progress, exercise, personalBests, exerciseProfile),
    [progress, exercise, personalBests, exerciseProfile],
  )

  const allPersonalBests = useMemo(() => {
    const namesInOrder = []
    if (settings) {
      for (const routine of settings.routineOrder || []) {
        for (const name of settings.exercises?.[routine] || []) {
          if (!namesInOrder.includes(name)) namesInOrder.push(name)
        }
      }
    }
    for (const name of Object.keys(personalBests)) {
      if (!namesInOrder.includes(name)) namesInOrder.push(name)
    }
    return namesInOrder
      .filter((name) => tracksPersonalBest(getExerciseProfile(name, settings)))
      .map((name) => [name, personalBests[name] || null])
  }, [personalBests, settings])

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
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: range.min, max: range.max } },
      },
    }
  }, [inbody, tab])

  const exerciseChart = useMemo(() => {
    if (progress.length === 0) return null
    const profile = exerciseProfile || getExerciseProfile(exercise, settings)
    const labels = progress.map((p) => {
      const d = new Date(p.date)
      return `${d.getMonth() + 1}/${d.getDate()}`
    })

    if (isCardioProfile(profile)) {
      const data = progress.map((p) => p.cardio?.minutes ?? p.minutes ?? null)
      const datasetLabel = chartValueLabel(exercise, profile)
      const yRange = calcYRange(data.filter((v) => v != null))

      return {
        data: {
          labels,
          datasets: [
            {
              label: datasetLabel,
              data,
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              tension: 0.3,
              fill: true,
              pointRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              min: 0,
              max: yRange.max,
              ticks: { stepSize: 1, precision: 0 },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label(ctx) {
                  const p = progress[ctx.dataIndex]
                  const summary = formatCardioSummary(p?.cardio, profile)
                  return `${datasetLabel}: ${ctx.parsed.y}분 (${summary})`
                },
              },
            },
          },
        },
      }
    }

    const hasWeight = progress.some((p) => p.weight != null && p.weight > 0)
    const data = hasWeight ? progress.map((p) => p.weight) : progress.map((p) => p.reps)
    const datasetLabel = hasWeight ? chartValueLabel(exercise, profile) : `${exercise} 회수`
    const yRange = hasWeight ? calcYRange(data) : { min: 0, max: undefined }

    return {
      data: {
        labels,
        datasets: [
          {
            label: datasetLabel,
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
        scales: {
          y: {
            beginAtZero: !hasWeight,
            min: hasWeight ? yRange.min : 0,
            max: hasWeight ? yRange.max : undefined,
            ticks: hasWeight && usesIntegerValue(profile)
              ? { stepSize: 1, precision: 0 }
              : undefined,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label(ctx) {
                const y = ctx.parsed.y
                if (hasWeight) {
                  return `${datasetLabel}: ${formatExerciseValue(y, profile)}`
                }
                return `${datasetLabel}: ${y}회`
              },
            },
          },
        },
      },
    }
  }, [progress, exercise, exerciseProfile, settings])

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
              {exerciseSummary.isCardio ? (
                <>
                  <Col xs={8}>
                    <Statistic
                      title={exerciseSummary.pbLabel || '최장 시간'}
                      value={exerciseSummary.longestMinutes ?? '-'}
                      suffix="분"
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="기록 횟수" value={exerciseSummary.totalSessions} suffix="번" />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="총 시간" value={exerciseSummary.totalMinutes ?? 0} suffix="분" />
                  </Col>
                </>
              ) : (
                <>
                  <Col xs={8}>
                    <Statistic
                      title={exerciseSummary.pbLabel || '역대 최고'}
                      value={
                        usesIntegerValue(exerciseProfile)
                          ? exerciseSummary.allTimeBest
                          : formatNumber(exerciseSummary.allTimeBest)
                      }
                      suffix={statisticValueSuffix(exerciseProfile)}
                    />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="기록 횟수" value={exerciseSummary.totalSessions} suffix="번" />
                  </Col>
                  <Col xs={8}>
                    <Statistic title="총 횟수" value={exerciseSummary.totalReps} suffix="회" />
                  </Col>
                </>
              )}
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
          {allPersonalBests.length === 0 ? (
            <Empty description="등록된 기구가 없습니다" />
          ) : (
            <Row gutter={[8, 8]}>
              {allPersonalBests.map(([name, best]) => {
                const profile = best?.profile || getExerciseProfile(name, settings)
                const pbLabel = personalBestLabel(profile)
                const hasRecord = best?.bestValue != null
                return (
                  <Col xs={12} sm={8} key={name}>
                    <Card size="small" type="inner">
                      <Text strong>{name}</Text>
                      <div>
                        {hasRecord ? (
                          <Text style={{ fontSize: 18, color: 'var(--primary)' }}>
                            {formatExerciseValue(best.bestValue, profile)}
                            {profile.unit === 'level' && (
                              <Text type="secondary" style={{ fontSize: 14 }}>
                                {' '}
                                레벨
                              </Text>
                            )}
                            {profile.unit === 'assist' && (
                              <Text type="secondary" style={{ fontSize: 14 }}>
                                {' '}
                                보조
                              </Text>
                            )}
                          </Text>
                        ) : (
                          <Text type="secondary">기록 없음</Text>
                        )}
                      </div>
                      {hasRecord && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {pbLabel}
                          {best.bestDate ? ` · ${displayDate(best.bestDate)}` : ''}
                        </Text>
                      )}
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
