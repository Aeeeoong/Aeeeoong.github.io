import { Alert, Flex, Typography } from 'antd'
import {
  BarChartOutlined,
  EditOutlined,
  HistoryOutlined,
  HomeOutlined,
  SettingOutlined,
  HeartOutlined,
} from '@ant-design/icons'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserSwitcher from './UserSwitcher'

const { Title, Text } = Typography

const NAV = [
  { to: '/', label: '홈', icon: <HomeOutlined />, end: true },
  { to: '/record', label: '기록', icon: <EditOutlined /> },
  { to: '/inbody', label: '인바디', icon: <HeartOutlined /> },
  { to: '/stats', label: '통계', icon: <BarChartOutlined /> },
  { to: '/history', label: '내역', icon: <HistoryOutlined /> },
  { to: '/settings', label: '설정', icon: <SettingOutlined /> },
]

export function PageHeader({ title, actions }) {
  const { bootstrapping, user } = useAuth()
  return (
    <header>
      <div className="header-content">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
          {user && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user}
              {bootstrapping ? ' · 동기화 중…' : ' · Firebase 연결됨'}
            </Text>
          )}
        </div>
        <div>{actions}</div>
      </div>
      <UserSwitcher />
    </header>
  )
}

export default function Layout() {
  const { syncError, migrationNote, clearMigrationNote } = useAuth()

  return (
    <>
      {syncError && (
        <Alert
          type="error"
          showIcon
          banner
          message="Firebase 오류"
          description={`${syncError} — Firestore 규칙과 익명 인증을 확인하세요.`}
        />
      )}

      {migrationNote && (
        <Alert
          type="success"
          showIcon
          banner
          closable
          onClose={clearMigrationNote}
          message={migrationNote}
        />
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
            <Flex vertical align="center" gap={2}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Flex>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
