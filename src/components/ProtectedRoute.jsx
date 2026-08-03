import { Spin } from 'antd'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isLoggedIn, ready, bootstrapping } = useAuth()

  if (!isLoggedIn) return <Navigate to="/login" replace />

  if (!ready || bootstrapping) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <Spin size="large" tip="Firebase 연결 중…" />
      </div>
    )
  }

  return <Outlet />
}
