import { useMemo, useState } from 'react'
import { App, Form, Input, Modal, Typography } from 'antd'
import { PlusOutlined, SwapOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { userHasPin } from '../services/storage'

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
  const [pinOpen, setPinOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const [pinForm] = Form.useForm()

  const displayUsers = useMemo(() => {
    const names = new Set(knownUsers)
    if (user) names.add(user)
    const list = [...names]
    list.sort((a, b) => {
      if (a === user) return -1
      if (b === user) return 1
      return a.localeCompare(b, 'ko')
    })
    return list
  }, [knownUsers, user])

  if (!user) return null

  async function performSwitch(name, pin = '') {
    try {
      const switched = await switchUser(name, pin)
      if (switched) {
        message.loading({ content: `${name}(으)로 전환 중…`, key: 'user-switch', duration: 0 })
      }
    } catch (err) {
      message.error(err.message || '전환 실패')
      throw err
    }
  }

  async function handleSwitch(name) {
    if (bootstrapping) return
    if (name === user) {
      message.info('현재 선택된 사용자예요')
      return
    }
    try {
      const needsPin = await userHasPin(name)
      if (needsPin) {
        setPendingUser(name)
        pinForm.resetFields()
        setPinOpen(true)
        return
      }
      await performSwitch(name)
    } catch {
      /* message shown */
    }
  }

  async function handlePinSubmit({ pin }) {
    setSubmitting(true)
    try {
      await performSwitch(pendingUser, pin)
      setPinOpen(false)
      setPendingUser('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddUser({ username, pin }) {
    const name = username.trim()
    if (name === user) {
      message.info('이미 선택된 사용자예요')
      return
    }
    setSubmitting(true)
    try {
      const needsPin = await userHasPin(name)
      if (needsPin && !pin) {
        setPendingUser(name)
        setAddOpen(false)
        form.resetFields()
        pinForm.resetFields()
        setPinOpen(true)
        return
      }
      await performSwitch(name, pin || '')
      setAddOpen(false)
      form.resetFields()
    } catch {
      /* message shown */
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="user-switcher">
        <Text type="secondary" className="user-switcher-label">
          <SwapOutlined /> 사용자 전환
          {bootstrapping ? ' · 불러오는 중…' : ''}
        </Text>
        <div className="user-switcher-tags">
          {displayUsers.map((name) => (
            <button
              key={name}
              type="button"
              disabled={bootstrapping}
              className={`user-switcher-btn${name === user ? ' active' : ''}`}
              onClick={() => handleSwitch(name)}
            >
              {name}
              {name === user ? ' ✓' : ''}
            </button>
          ))}
          <button
            type="button"
            className="user-switcher-btn user-switcher-add"
            disabled={bootstrapping}
            onClick={() => setAddOpen(true)}
          >
            <PlusOutlined /> 사용자 추가
          </button>
        </div>
        {displayUsers.length < 2 && (
          <Text type="secondary" className="user-switcher-hint">
            파트너 이름을 추가하면 여기서 바로 전환할 수 있어요
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
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          파트너 이름을 입력하면 그 사람 기록으로 바뀝니다. PIN이 설정된 사용자는 PIN이 필요합니다.
        </Paragraph>
        <Form form={form} layout="vertical" onFinish={handleAddUser} requiredMark={false}>
          <Form.Item name="username" rules={USERNAME_RULES}>
            <Input placeholder="예: 파트너 이름" autoFocus autoComplete="username" />
          </Form.Item>
          <Form.Item name="pin" label="PIN (설정된 경우)">
            <Input.Password inputMode="numeric" maxLength={8} placeholder="4~8자리 숫자" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${pendingUser} PIN 입력`}
        open={pinOpen}
        okText="전환"
        cancelText="취소"
        confirmLoading={submitting}
        onCancel={() => {
          setPinOpen(false)
          setPendingUser('')
        }}
        onOk={() => pinForm.submit()}
        destroyOnHidden
      >
        <Form form={pinForm} layout="vertical" onFinish={handlePinSubmit} requiredMark={false}>
          <Form.Item name="pin" rules={[{ required: true, message: 'PIN을 입력하세요' }]}>
            <Input.Password inputMode="numeric" maxLength={8} autoFocus placeholder="PIN" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
