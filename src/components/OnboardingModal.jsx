import { useState } from 'react'
import { Button, Modal, Steps, Typography } from 'antd'
import { ONBOARDING_STEPS, markOnboardingSeen } from '../lib/onboarding'

const { Paragraph, Text } = Typography

export default function OnboardingModal({ open, username, onClose }) {
  const [step, setStep] = useState(0)
  const current = ONBOARDING_STEPS[step]
  const isLast = step >= ONBOARDING_STEPS.length - 1

  function handleClose() {
    markOnboardingSeen(username)
    setStep(0)
    onClose()
  }

  function handleNext() {
    if (isLast) {
      handleClose()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <Modal
      open={open}
      title="운동 트래커 사용법"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <Button type="text" onClick={handleClose}>
            나중에
          </Button>
          <Button type="primary" onClick={handleNext}>
            {isLast ? '시작하기' : '다음'}
          </Button>
        </div>
      }
      onCancel={handleClose}
      destroyOnClose
    >
      <Steps
        size="small"
        current={step}
        items={ONBOARDING_STEPS.map((s) => ({ title: s.title }))}
        style={{ marginBottom: 24 }}
      />
      <Paragraph style={{ marginBottom: 8, fontSize: 15 }}>
        <Text strong>{current.title}</Text>
      </Paragraph>
      <Paragraph type="secondary" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
        {current.body.replace(/\*\*(.*?)\*\*/g, '$1')}
      </Paragraph>
    </Modal>
  )
}
