import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { isLoggedIn, login, knownUsers, bootstrapping } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoggedIn && !bootstrapping) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    const name = username.trim()

    if (!name) {
      setError('사용자 이름을 입력해주세요')
      return
    }
    if (name.length < 2) {
      setError('사용자 이름은 2글자 이상이어야 합니다')
      return
    }
    if (name.length > 20) {
      setError('사용자 이름은 20글자 이하여야 합니다')
      return
    }
    if (!/^[가-힣a-zA-Z0-9]+$/.test(name)) {
      setError('한글, 영문, 숫자만 사용 가능합니다')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await login(name)
    } catch (err) {
      setError(err.message || '로그인 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">운동 트래커</h1>
        <p className="login-subtitle">사용자 이름을 입력하세요</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="login-input"
            placeholder="사용자 이름 (예: 보섭)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? '연결 중…' : '시작하기'}
          </button>
        </form>

        {error && <div className="error-message show">{error}</div>}

        <div className="login-info">
          데이터는 Firebase에 저장됩니다. 예전 로컬 데이터가 있으면 로그인 시 자동으로 이전합니다.
        </div>

        {knownUsers.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                marginBottom: '0.5rem',
                textAlign: 'center',
              }}
            >
              등록된 사용자
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {knownUsers.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="user-badge"
                  onClick={() => setUsername(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
