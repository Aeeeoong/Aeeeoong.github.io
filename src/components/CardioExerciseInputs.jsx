import { Form, InputNumber } from 'antd'
import { getCardioFieldDefs } from '../lib/exerciseConfig'

export default function CardioExerciseInputs({ ex, ph, index, updateExercise, profile }) {
  const fields = getCardioFieldDefs(profile)
  const cardio = ex.cardio || {}
  const phCardio = ph?.cardio || {}

  function updateCardio(key, value) {
    updateExercise(index, {
      cardio: { ...cardio, [key]: value },
    })
  }

  return (
    <div className="simple-exercise-inputs cardio-exercise-inputs">
      {fields.map(({ key, label, step, precision, min, max }) => (
        <Form.Item key={key} label={label} className={`field-cardio-${key}`} style={{ marginBottom: 8 }}>
          <InputNumber
            style={{ width: '100%' }}
            step={step}
            precision={precision}
            min={min}
            max={max}
            placeholder={phCardio[key] != null ? String(phCardio[key]) : undefined}
            value={cardio[key]}
            onChange={(v) => updateCardio(key, v)}
          />
        </Form.Item>
      ))}
    </div>
  )
}
