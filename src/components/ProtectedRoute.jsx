import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isLoggedIn, ready, bootstrapping } = useAuth()

  if (!isLoggedIn) return <Navigate to="/login" replace />

  if (!ready || bootstrapping) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Firebase 연결 중…
          </div>
        </div>
      </div>
    )
  }

  return <Outlet />
}
