import { useState } from 'react'
import { App, Form, Input, Modal, Tag, Typography } from 'antd'
import { PlusOutlined, SwapOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const { Text, Paragraph } = Typography

const USERNAME_RULES = [
  { required: true, message: '사용자 이름을 입력해주세요' },
  { min: 2, message: '2글자 이상이어야 합니다' },
  { max: 20, message: '20글자 이하여야 합니다' },
  { pattern: /^[가-힣a-zA-Z0-9]+$/, message: '한글, 영문, 숫자만 가능합니다' },
]

export default function UserSwitcher() {
  const { user, knownUsers, switchUser, bootstrapping } = useAuth()
  const { message } = App.useApp()
  const [addOpen, setAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  if (!user) return null

  async function handleSwitch(name) {
    if (bootstrapping || name === user) return
    await switchUser(name)
    message.success(`${name}(으)로 전환했어요`)
  }

  async function handleAddUser({ username }) {
    const name = username.trim()
    if (name === user) {
      message.info('이미 선택된 사용자예요')
      return
    }
    setSubmitting(true)
    try {
      await switchUser(name)
      setAddOpen(false)
      form.resetFields()
      message.success(`${name}(으)로 전환했어요`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="user-switcher">
        <Text type="secondary" className="user-switcher-label">
          <SwapOutlined /> 사용자 {bootstrapping ? '· 동기화 중…' : ''}
        </Text>
        <div className="user-switcher-tags">
          {knownUsers.map((name) => (
            <Tag
              key={name}
              color={name === user ? 'purple' : 'default'}
              className={`user-switcher-tag${name === user ? ' active' : ''}`}
              onClick={() => handleSwitch(name)}
            >
              {name}
              {name === user ? ' ✓' : ''}
            </Tag>
          ))}
          <Tag
            className="user-switcher-tag user-switcher-add"
            onClick={() => !bootstrapping && setAddOpen(true)}
          >
            <PlusOutlined /> 사용자 추가
          </Tag>
        </div>
        {knownUsers.length < 2 && (
          <Text type="secondary" className="user-switcher-hint">
            파트너 이름을 추가하면 탭 한 번으로 전환할 수 있어요
          </Text>
        )}
      </div>

      <Modal
        title="사용자 추가 / 전환"
        open={addOpen}
        okText="전환"
        cancelText="취소"
        confirmLoading={submitting}
        onCancel={() => {
          setAddOpen(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          파트너 이름을 입력하면 그 사람 기록으로 바뀝니다. 각자 데이터는 따로 저장돼요.
        </Paragraph>
        <Form form={form} layout="vertical" onFinish={handleAddUser} requiredMark={false}>
          <Form.Item name="username" rules={USERNAME_RULES}>
            <Input placeholder="예: 파트너 이름" autoFocus autoComplete="username" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
