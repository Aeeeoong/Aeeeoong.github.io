import { Tag, Typography } from 'antd'
import { SwapOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Text } = Typography

export default function UserSwitcher() {
  const { user, knownUsers, switchUser, bootstrapping } = useAuth()

  if (!user || knownUsers.length < 2) return null

  return (
    <div className="user-switcher">
      <Text type="secondary" className="user-switcher-label">
        <SwapOutlined /> 사용자
      </Text>
      <div className="user-switcher-tags">
        {knownUsers.map((name) => (
          <Tag
            key={name}
            color={name === user ? 'purple' : 'default'}
            className={`user-switcher-tag${name === user ? ' active' : ''}`}
            onClick={() => !bootstrapping && switchUser(name)}
          >
            {name}
            {name === user ? ' ✓' : ''}
          </Tag>
        ))}
      </div>
    </div>
  )
}
