import { useEffect, useState } from 'react'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { addInbody, getInbodyRecords, getLatestInbody } from '../services/storage'
import { displayDate, formatNumber, getTodayString } from '../lib/utils'

export default function InbodyPage() {
  const { user } = useAuth()
  const [date, setDate] = useState(getTodayString())
  const [weight, setWeight] = useState('')
  const [muscle, setMuscle] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const [latestRow, rows] = await Promise.all([
      getLatestInbody(user),
      getInbodyRecords(user, 10),
    ])
    setLatest(latestRow)
    setHistory(rows)
  }

  useEffect(() => {
    refresh().catch((err) => alert(`로드 실패: ${err.message}`))
  }, [user])

  async function handleSave() {
    if (!weight || !muscle || !bodyFat) {
      alert('모든 항목을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await addInbody(user, { date, weight, muscleMass: muscle, bodyFat })
      alert('인바디 기록이 Firebase에 저장되었습니다!')
      setWeight('')
      setMuscle('')
      setBodyFat('')
      await refresh()
    } catch (err) {
      alert(`저장 실패: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="인바디" />
      <main className="container">
        <div className="card">
          <h2 className="card-title">인바디 기록</h2>

          <div className="form-group">
            <label className="form-label">측정 날짜</label>
            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">체중 (kg)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder={latest ? `최근: ${formatNumber(latest.weight)}kg` : ''}
            />
            {latest && (
              <small style={{ color: 'var(--text-secondary)' }}>
                최근: {formatNumber(latest.weight)}kg
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">골격근량 (kg)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
            />
            {latest && (
              <small style={{ color: 'var(--text-secondary)' }}>
                최근: {formatNumber(latest.muscleMass)}kg
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">체지방률 (%)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
            {latest && (
              <small style={{ color: 'var(--text-secondary)' }}>
                최근: {formatNumber(latest.bodyFat)}%
              </small>
            )}
          </div>

          <button type="button" className="btn btn-success btn-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Firebase 저장 중…' : '인바디 저장하기'}
          </button>
        </div>

        <div className="card">
          <h2 className="card-title">최근 기록</h2>
          {history.length === 0 ? (
            <div className="empty-state">기록이 없습니다</div>
          ) : (
            <ul className="history-list">
              {history.map((record, index) => {
                let change = null
                if (index < history.length - 1) {
                  const prev = history[index + 1]
                  const weightChange = record.weight - prev.weight
                  const muscleChange = record.muscleMass - prev.muscleMass
                  change = (
                    <small style={{ color: 'var(--text-secondary)' }}>
                      체중 {weightChange >= 0 ? '+' : ''}
                      {formatNumber(weightChange)}kg, 근육 {muscleChange >= 0 ? '+' : ''}
                      {formatNumber(muscleChange)}kg
                    </small>
                  )
                }
                return (
                  <li key={record.id} className="history-item">
                    <div className="history-date">{displayDate(record.date)}</div>
                    <div>
                      체중: {formatNumber(record.weight)}kg | 골격근:{' '}
                      {formatNumber(record.muscleMass)}kg | 체지방: {formatNumber(record.bodyFat)}%
                    </div>
                    {change}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
