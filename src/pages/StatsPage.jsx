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
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import {
  getExerciseProgress,
  getInbodyRecords,
  getSettings,
  getWorkoutStats,
} from '../services/storage'

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
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState(null)
  const [routine, setRoutine] = useState('')
  const [exercise, setExercise] = useState('')
  const [progress, setProgress] = useState([])

  useEffect(() => {
    Promise.all([getInbodyRecords(user), getWorkoutStats(user), getSettings(user)]).then(
      ([records, s, conf]) => {
        setInbody([...records].reverse())
        setStats(s)
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
    if (!stats) return null
    const types = Object.keys(stats.workoutsByType)
    if (types.length === 0) return null
    return {
      data: {
        labels: types,
        datasets: [
          {
            data: Object.values(stats.workoutsByType),
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
  }, [stats])

  return (
    <>
      <PageHeader title="통계" />
      <main className="container">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">인바디 추이</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                ['weight', '체중'],
                ['muscle', '골격근'],
                ['bodyfat', '체지방'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`tab-btn${tab === key ? ' active' : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            {inbodyChart ? <Line data={inbodyChart.data} options={inbodyChart.options} /> : (
              <div className="empty-state">인바디 데이터가 없습니다</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">운동별 증량 추이</h2>
          <div className="form-group">
            <label className="form-label">루틴</label>
            <select
              className="form-select"
              value={routine}
              onChange={(e) => {
                const next = e.target.value
                setRoutine(next)
                setExercise(settings?.exercises[next]?.[0] || '')
              }}
            >
              {(settings?.routineOrder || []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">운동</label>
            <select className="form-select" value={exercise} onChange={(e) => setExercise(e.target.value)}>
              {exerciseOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="chart-container">
            {exerciseChart ? (
              <Line data={exerciseChart.data} options={exerciseChart.options} />
            ) : (
              <div className="empty-state">선택한 운동의 기록이 없습니다</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">운동 분포</h2>
          <div className="chart-container">
            {distribution ? (
              <Doughnut data={distribution.data} options={distribution.options} />
            ) : (
              <div className="empty-state">운동 기록이 없습니다</div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
