import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Alert, Button, Card, Form, Input, Space, Tag, Typography } from 'antd'
import { useAuth } from '../context/AuthContext'

const { Title, Paragraph, Text } = Typography

export default function LoginPage() {
  const { isLoggedIn, login, knownUsers, bootstrapping } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  if (isLoggedIn && !bootstrapping) return <Navigate to="/" replace />

  async function handleFinish({ username }) {
    const name = username.trim()
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
      <Card className="login-card" bordered={false}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 4, color: '#a5b4fc' }}>
          운동 트래커
        </Title>
        <Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          사용자 이름을 입력하세요
        </Paragraph>

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '사용자 이름을 입력해주세요' },
              { min: 2, message: '2글자 이상이어야 합니다' },
              { max: 20, message: '20글자 이하여야 합니다' },
              { pattern: /^[가-힣a-zA-Z0-9]+$/, message: '한글, 영문, 숫자만 가능합니다' },
            ]}
          >
            <Input size="large" placeholder="사용자 이름 (예: 보섭)" autoFocus autoComplete="username" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            시작하기
          </Button>
        </Form>

        {error && (
          <Alert style={{ marginTop: 16 }} type="error" showIcon message={error} />
        )}

        <Alert
          style={{ marginTop: 24 }}
          type="info"
          showIcon
          message="데이터는 Firebase에 저장됩니다. 예전 로컬 데이터가 있으면 로그인 시 자동 이전됩니다."
        />

        {knownUsers.length > 0 && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Text type="secondary">등록된 사용자</Text>
            <div style={{ marginTop: 8 }}>
              <Space wrap size={[8, 8]} style={{ justifyContent: 'center' }}>
                {knownUsers.map((name) => (
                  <Tag
                    key={name}
                    color="purple"
                    style={{ cursor: 'pointer', padding: '4px 12px', fontSize: 14 }}
                    onClick={() => form.setFieldsValue({ username: name })}
                  >
                    {name}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
