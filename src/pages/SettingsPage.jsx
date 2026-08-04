import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App,
  Button,
  Card,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Typography,
  Upload,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  LogoutOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { PageHeader } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { clearOnboardingSeen } from '../lib/onboarding'
import {
  clearUserData,
  exportBundle,
  getSettings,
  importBundle,
  resetSettings,
  saveSettings,
} from '../services/storage'

const { Text, Paragraph } = Typography

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { message, modal } = App.useApp()
  const [settings, setSettings] = useState(null)
  const [routineModal, setRoutineModal] = useState(null)
  const [exerciseModal, setExerciseModal] = useState(null)
  const [routineName, setRoutineName] = useState('')
  const [exerciseName, setExerciseName] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    setSettings(await getSettings(user))
  }

  useEffect(() => {
    refresh().catch((err) => modal.error({ title: '설정 로드 실패', content: err.message }))
  }, [user])

  async function persist(next) {
    setBusy(true)
    try {
      await saveSettings(user, next)
      setSettings(next)
      message.success('저장됨')
    } catch (err) {
      modal.error({ title: '저장 실패', content: err.message })
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveRoutine() {
    const name = routineName.trim()
    if (!name) {
      message.warning('루틴 이름을 입력하세요.')
      return
    }
    const next = structuredClone(settings)
    if (routineModal?.mode === 'edit') {
      const oldName = next.routineOrder[routineModal.index]
      next.routineOrder[routineModal.index] = name
      if (oldName !== name) {
        next.exercises[name] = next.exercises[oldName] || []
        delete next.exercises[oldName]
      }
    } else {
      if (next.routineOrder.includes(name)) {
        message.warning('이미 존재하는 루틴 이름입니다.')
        return
      }
      next.routineOrder.push(name)
      next.exercises[name] = []
    }
    await persist(next)
    setRoutineModal(null)
  }

  async function handleSaveExercise() {
    const name = exerciseName.trim()
    if (!name || !exerciseModal) return
    const next = structuredClone(settings)
    const list = next.exercises[exerciseModal.routine] || []
    if (exerciseModal.mode === 'edit') {
      list[exerciseModal.index] = name
    } else {
      if (list.includes(name)) {
        message.warning('이미 존재하는 운동 이름입니다.')
        return
      }
      list.push(name)
    }
    next.exercises[exerciseModal.routine] = list
    await persist(next)
    setExerciseModal(null)
  }

  async function handleExport() {
    try {
      const data = await exportBundle(user)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `workout-tracker-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success('데이터를 내보냈습니다.')
    } catch (err) {
      modal.error({ title: '내보내기 실패', content: err.message })
    }
  }

  async function handleImportFile(file) {
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await importBundle(user, json)
      await refresh()
      message.success('데이터를 Firebase로 가져왔습니다.')
    } catch (err) {
      modal.error({ title: '가져오기 실패', content: err.message })
    }
    return false
  }

  if (!settings) {
    return (
      <>
        <PageHeader title="설정" />
        <main className="container">
          <div className="loading">
            <Spin size="large" />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <PageHeader title="설정" />
      <main className="container">
        <Card title="계정" style={{ marginBottom: 16 }}>
          <Paragraph>
            현재 사용자: <Text strong>{user}</Text>
          </Paragraph>
          <Paragraph type="secondary" style={{ fontSize: 13 }}>
            파트너와 번갈아 쓸 때는 화면 상단의 사용자 태그를 눌러 전환하세요.
          </Paragraph>
          <Paragraph style={{ color: '#34d399' }}>저장소: Firebase Firestore (로컬 폴백 없음)</Paragraph>
          <Space wrap>
            <Button
              onClick={() => {
                clearOnboardingSeen(user)
                navigate('/', { state: { showOnboarding: true } })
              }}
            >
              사용법 다시 보기
            </Button>
            <Popconfirm title="로그아웃할까요?" okText="로그아웃" cancelText="취소" onConfirm={logout}>
              <Button danger icon={<LogoutOutlined />}>
                로그아웃
              </Button>
            </Popconfirm>
          </Space>
        </Card>

        <Card
          title="루틴 관리"
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setRoutineName('')
                setRoutineModal({ mode: 'add' })
              }}
            >
              루틴 추가
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {settings.routineOrder.map((name, index) => {
              const exercises = settings.exercises[name] || []
              return (
                <Card
                  key={name}
                  size="small"
                  type="inner"
                  title={
                    <span>
                      {name}{' '}
                      <Text type="secondary" style={{ fontWeight: 400 }}>
                        · {exercises.length}개
                      </Text>
                    </span>
                  }
                  extra={
                    <Space>
                      <Button
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={index === 0 || busy}
                        onClick={async () => {
                          const next = structuredClone(settings)
                          ;[next.routineOrder[index - 1], next.routineOrder[index]] = [
                            next.routineOrder[index],
                            next.routineOrder[index - 1],
                          ]
                          await persist(next)
                        }}
                      />
                      <Button
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={index === settings.routineOrder.length - 1 || busy}
                        onClick={async () => {
                          const next = structuredClone(settings)
                          ;[next.routineOrder[index + 1], next.routineOrder[index]] = [
                            next.routineOrder[index],
                            next.routineOrder[index + 1],
                          ]
                          await persist(next)
                        }}
                      />
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setRoutineName(name)
                          setRoutineModal({ mode: 'edit', index })
                        }}
                      />
                      <Popconfirm
                        title={`"${name}" 루틴을 삭제할까요?`}
                        okText="삭제"
                        cancelText="취소"
                        okButtonProps={{ danger: true }}
                        onConfirm={async () => {
                          const next = structuredClone(settings)
                          next.routineOrder.splice(index, 1)
                          delete next.exercises[name]
                          await persist(next)
                        }}
                      >
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                >
                  <List
                    size="small"
                    dataSource={exercises}
                    locale={{ emptyText: '운동이 없습니다' }}
                    renderItem={(ex, exIndex) => (
                      <List.Item
                        actions={[
                          <Button
                            key="up"
                            type="text"
                            size="small"
                            icon={<ArrowUpOutlined />}
                            disabled={exIndex === 0}
                            onClick={async () => {
                              const next = structuredClone(settings)
                              const list = next.exercises[name]
                              ;[list[exIndex - 1], list[exIndex]] = [list[exIndex], list[exIndex - 1]]
                              await persist(next)
                            }}
                          />,
                          <Button
                            key="down"
                            type="text"
                            size="small"
                            icon={<ArrowDownOutlined />}
                            disabled={exIndex === exercises.length - 1}
                            onClick={async () => {
                              const next = structuredClone(settings)
                              const list = next.exercises[name]
                              ;[list[exIndex + 1], list[exIndex]] = [list[exIndex], list[exIndex + 1]]
                              await persist(next)
                            }}
                          />,
                          <Button
                            key="edit"
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setExerciseName(ex)
                              setExerciseModal({ mode: 'edit', routine: name, index: exIndex })
                            }}
                          />,
                          <Popconfirm
                            key="del"
                            title={`"${ex}" 삭제할까요?`}
                            okText="삭제"
                            cancelText="취소"
                            okButtonProps={{ danger: true }}
                            onConfirm={async () => {
                              const next = structuredClone(settings)
                              next.exercises[name].splice(exIndex, 1)
                              await persist(next)
                            }}
                          >
                            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}
                      >
                        {ex}
                      </List.Item>
                    )}
                  />
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      setExerciseName('')
                      setExerciseModal({ mode: 'add', routine: name })
                    }}
                  >
                    운동 추가
                  </Button>
                </Card>
              )
            })}
          </Space>
        </Card>

        <Card title="데이터" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" icon={<ExportOutlined />} block onClick={handleExport}>
              Firebase 데이터 내보내기
            </Button>
            <Upload accept="application/json" showUploadList={false} beforeUpload={handleImportFile}>
              <Button icon={<ImportOutlined />} block>
                JSON 가져오기 → Firebase
              </Button>
            </Upload>
            <Popconfirm
              title="루틴 설정을 기본값으로 초기화할까요? (운동 기록은 유지)"
              okText="초기화"
              cancelText="취소"
              onConfirm={async () => {
                const defaults = await resetSettings(user)
                setSettings(defaults)
                message.success('설정이 초기화되었습니다.')
              }}
            >
              <Button block>루틴 설정 초기화</Button>
            </Popconfirm>
            <Popconfirm
              title={`"${user}" 사용자의 운동·인바디 기록을 모두 삭제할까요?`}
              description="Firebase에 저장된 이 사용자 데이터만 삭제됩니다. 되돌릴 수 없습니다."
              okText="전체 삭제"
              cancelText="취소"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                setBusy(true)
                try {
                  await clearUserData(user)
                  const defaults = await getSettings(user)
                  setSettings(defaults)
                  message.success('기록이 삭제되었습니다. 홈에서 확인해 주세요.')
                } catch (err) {
                  modal.error({ title: '삭제 실패', content: err.message })
                } finally {
                  setBusy(false)
                }
              }}
            >
              <Button block danger disabled={busy}>
                이 사용자 기록 전체 삭제
              </Button>
            </Popconfirm>
          </Space>
        </Card>

        <Card title="앱 정보">
          <Text type="secondary">버전 2.1.0 · React + Vite + Firebase + antd</Text>
        </Card>
      </main>

      <Modal
        title={routineModal?.mode === 'edit' ? '루틴 편집' : '루틴 추가'}
        open={!!routineModal}
        onCancel={() => setRoutineModal(null)}
        onOk={handleSaveRoutine}
        okText="저장"
        cancelText="취소"
      >
        <Input
          placeholder="루틴 이름"
          value={routineName}
          onChange={(e) => setRoutineName(e.target.value)}
          onPressEnter={handleSaveRoutine}
          autoFocus
        />
      </Modal>

      <Modal
        title={
          exerciseModal
            ? `${exerciseModal.routine} - ${exerciseModal.mode === 'edit' ? '운동 편집' : '운동 추가'}`
            : ''
        }
        open={!!exerciseModal}
        onCancel={() => setExerciseModal(null)}
        onOk={handleSaveExercise}
        okText="저장"
        cancelText="취소"
      >
        <Input
          placeholder="운동 이름"
          value={exerciseName}
          onChange={(e) => setExerciseName(e.target.value)}
          onPressEnter={handleSaveExercise}
          autoFocus
        />
      </Modal>
    </>
  )
}
