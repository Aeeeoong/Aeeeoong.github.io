import { Form, InputNumber } from 'antd'
import { inputNumberPropsForProfile } from '../lib/exerciseConfig'

export default function SimpleExerciseInputs({ ex, ph = {}, index, updateExercise, profile }) {
  const numProps = inputNumberPropsForProfile(profile)
  const isPlainNumber = profile?.unit === 'level' || profile?.unit === 'assist'
  return (
    <div className="simple-exercise-inputs">
      <Form.Item label={profile?.inputLabel || '무게'} className="field-weight" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          {...numProps}
          placeholder={ph.weight != null ? String(ph.weight) : isPlainNumber ? '0' : '0.0'}
          value={ex.weight}
          onChange={(v) => updateExercise(index, { weight: v })}
        />
      </Form.Item>
      <Form.Item label="회" className="field-reps" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          controls={false}
          placeholder={ph.reps != null ? String(ph.reps) : '0'}
          value={ex.reps}
          onChange={(v) => updateExercise(index, { reps: v })}
        />
      </Form.Item>
      <Form.Item label="세트" className="field-sets" style={{ marginBottom: 8 }}>
        <InputNumber
          style={{ width: '100%' }}
          controls={false}
          placeholder={ph.sets != null ? String(ph.sets) : '0'}
          value={ex.sets}
          onChange={(v) => updateExercise(index, { sets: v })}
        />
      </Form.Item>
    </div>
  )
}
