import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: '홈', end: true },
  { to: '/record', label: '기록' },
  { to: '/inbody', label: '인바디' },
  { to: '/stats', label: '통계' },
  { to: '/history', label: '내역' },
  { to: '/settings', label: '설정' },
]

export function PageHeader({ title, actions }) {
  const { bootstrapping, user } = useAuth()
  return (
    <header>
      <div className="header-content">
        <div>
          <h1>{title}</h1>
          {user && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {user}
              {bootstrapping ? ' · 동기화 중…' : ' · Firebase 연결됨'}
            </div>
          )}
        </div>
        <div>{actions}</div>
      </div>
    </header>
  )
}

export default function Layout() {
  const { syncError, migrationNote, clearMigrationNote } = useAuth()

  return (
    <>
      {syncError && (
        <div className="banner banner-error">
          Firebase 오류: {syncError}
          <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
            저장/불러오기가 되지 않습니다. Firestore 보안 규칙과 익명 인증을 확인하세요.
          </div>
        </div>
      )}

      {migrationNote && (
        <div className="banner banner-ok">
          {migrationNote}
          <button type="button" className="banner-close" onClick={clearMigrationNote}>
            닫기
          </button>
        </div>
      )}

      <Outlet />

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <div className="nav-label">{item.label}</div>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
