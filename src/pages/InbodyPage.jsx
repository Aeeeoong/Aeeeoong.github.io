import { useEffect, useState } from 'react'
import { App, Button, Card, Form, InputNumber, List, Modal, Popconfirm, Spin, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import DateField from '../components/DateField'
import { useAuth } from '../context/AuthContext'
import {
  addInbody,
  deleteInbody,
  getInbodyRecords,
  getLatestInbody,
  updateInbody,
} from '../services/storage'
import { displayDate, formatNumber, getTodayString } from '../lib/utils'

const { Text } = Typography

export default function InbodyPage() {
  const { user } = useAuth()
  const { message, modal } = App.useApp()
  const [date, setDate] = useState(getTodayString())
  const [weight, setWeight] = useState(null)
  const [muscle, setMuscle] = useState(null)
  const [bodyFat, setBodyFat] = useState(null)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  async function refresh() {
    const [latestRow, rows] = await Promise.all([
      getLatestInbody(user),
      getInbodyRecords(user, 20),
    ])
    setLatest(latestRow)
    setHistory(rows)
  }

  useEffect(() => {
    setLoading(true)
    refresh()
      .catch((err) => modal.error({ title: '로드 실패', content: err.message }))
      .finally(() => setLoading(false))
  }, [user])

  function resetForm() {
    setDate(getTodayString())
    setWeight(null)
    setMuscle(null)
    setBodyFat(null)
  }

  async function handleSave() {
    if (weight == null || muscle == null || bodyFat == null) {
      message.warning('모든 항목을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await addInbody(user, { date, weight, muscleMass: muscle, bodyFat })
      message.success('인바디 기록이 저장되었습니다!')
      resetForm()
      await refresh()
    } catch (err) {
      modal.error({ title: '저장 실패', content: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editing || weight == null || muscle == null || bodyFat == null) {
      message.warning('모든 항목을 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      await updateInbody(user, {
        ...editing,
        date,
        weight,
        muscleMass: muscle,
        bodyFat,
      })
      message.success('수정되었습니다.')
      setEditing(null)
      resetForm()
      await refresh()
    } catch (err) {
      modal.error({ title: '수정 실패', content: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteInbody(user, id)
      message.success('삭제되었습니다.')
      if (editing?.id === id) {
        setEditing(null)
        resetForm()
      }
      await refresh()
    } catch (err) {
      modal.error({ title: '삭제 실패', content: err.message })
    }
  }

  function openEdit(record) {
    setEditing(record)
    setDate(record.date)
    setWeight(record.weight)
    setMuscle(record.muscleMass)
    setBodyFat(record.bodyFat)
  }

  function cancelEdit() {
    setEditing(null)
    resetForm()
  }

  return (
    <>
      <PageHeader title="인바디" />
      <main className="container">
        {loading ? (
          <div className="loading">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <Card
              title={editing ? '인바디 수정' : '인바디 기록'}
              extra={
                editing ? (
                  <Button type="link" onClick={cancelEdit}>
                    취소
                  </Button>
                ) : null
              }
              style={{ marginBottom: 16 }}
            >
              <Form layout="vertical">
                <Form.Item label="측정 날짜">
                  <DateField value={date} onChange={setDate} />
                </Form.Item>
                <Form.Item
                  label="체중 (kg)"
                  extra={latest && !editing ? `최근: ${formatNumber(latest.weight)}kg` : undefined}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    step={0.1}
                    value={weight}
                    onChange={setWeight}
                  />
                </Form.Item>
                <Form.Item
                  label="골격근량 (kg)"
                  extra={latest && !editing ? `최근: ${formatNumber(latest.muscleMass)}kg` : undefined}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    step={0.1}
                    value={muscle}
                    onChange={setMuscle}
                  />
                </Form.Item>
                <Form.Item
                  label="체지방률 (%)"
                  extra={latest && !editing ? `최근: ${formatNumber(latest.bodyFat)}%` : undefined}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    size="large"
                    step={0.1}
                    value={bodyFat}
                    onChange={setBodyFat}
                  />
                </Form.Item>
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={saving}
                  onClick={editing ? handleUpdate : handleSave}
                >
                  {editing ? '수정 저장' : '저장하기'}
                </Button>
              </Form>
            </Card>

            <Card title="최근 기록">
              <List
                dataSource={history}
                locale={{ emptyText: '기록이 없습니다' }}
                renderItem={(record, index) => {
                  let change = null
                  if (index < history.length - 1) {
                    const prev = history[index + 1]
                    const weightChange = record.weight - prev.weight
                    const muscleChange = record.muscleMass - prev.muscleMass
                    change = (
                      <Text type="secondary">
                        체중 {weightChange >= 0 ? '+' : ''}
                        {formatNumber(weightChange)}kg, 근육 {muscleChange >= 0 ? '+' : ''}
                        {formatNumber(muscleChange)}kg
                      </Text>
                    )
                  }
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="edit"
                          type="link"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => openEdit(record)}
                        >
                          수정
                        </Button>,
                        <Popconfirm
                          key="delete"
                          title="이 인바디 기록을 삭제할까요?"
                          okText="삭제"
                          cancelText="취소"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete(record.id)}
                        >
                          <Button type="link" size="small" danger>
                            삭제
                          </Button>
                        </Popconfirm>,
                      ]}
                    >
                      <List.Item.Meta
                        title={displayDate(record.date)}
                        description={
                          <>
                            <div>
                              체중 {formatNumber(record.weight)}kg · 골격근{' '}
                              {formatNumber(record.muscleMass)}kg · 체지방{' '}
                              {formatNumber(record.bodyFat)}%
                            </div>
                            {change}
                          </>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            </Card>
          </>
        )}
      </main>
    </>
  )
}
