import { Spin } from 'antd'
import { Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { App } from 'antd'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isLoggedIn, bootstrapping, user } = useAuth()
  const { message } = App.useApp()

  useEffect(() => {
    if (!bootstrapping && user && sessionStorage.getItem('user_switch_pending')) {
      sessionStorage.removeItem('user_switch_pending')
      message.success({ content: `${user}(으)로 전환됨`, key: 'user-switch', duration: 2 })
    }
  }, [bootstrapping, user, message])

  if (!isLoggedIn) return <Navigate to="/login" replace />

  return (
    <>
      {bootstrapping && (
        <div className="bootstrap-overlay">
          <Spin size="large" tip="사용자 데이터 불러오는 중…" />
        </div>
      )}
      <Outlet key={user} />
    </>
  )
}
