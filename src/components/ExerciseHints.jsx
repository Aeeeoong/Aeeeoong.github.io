import { Tag, Typography } from 'antd'
import { getExerciseInputHint, personalBestLabel, usesIntegerValue } from '../lib/exerciseConfig'
import { compareWithPersonalBest, compareWithPrevious } from '../lib/workoutInsights'

const { Text } = Typography

export function ExerciseCompareHint({ current, previous, profile }) {
  const parts = compareWithPrevious(current, previous, profile)
  if (!parts?.length) return null

  return (
    <div className="exercise-compare-hint">
      <Text type="secondary" style={{ fontSize: 12 }}>
        지난번 대비{' '}
      </Text>
      {parts.map((p) => (
        <Tag
          key={p.key}
          color={p.tone === 'up' ? 'success' : p.tone === 'down' ? 'warning' : 'default'}
          style={{ marginInlineEnd: 4 }}
        >
          {p.label} {p.text}
        </Tag>
      ))}
    </div>
  )
}

export function PersonalBestCompareHint({ current, bestEntry, profile }) {
  const hint = compareWithPersonalBest(current, bestEntry, profile)
  if (!hint) return null

  const color =
    hint.status === 'beat' ? 'gold' : hint.status === 'tie' ? 'processing' : 'default'

  return (
    <div className="exercise-compare-hint">
      <Text type="secondary" style={{ fontSize: 12 }}>
        {personalBestLabel(profile)}{' '}
      </Text>
      <Tag color={color} style={{ marginInlineEnd: 4 }}>
        {hint.status === 'beat' ? `🏆 ${hint.label}` : hint.label}
      </Tag>
    </div>
  )
}

export function PersonalBestBadge({ pr }) {
  if (!pr) return null
  const label = pr.profile ? personalBestLabel(pr.profile) : '역대 최고'
  const diffStr = usesIntegerValue(pr.profile)
    ? String(pr.diff)
    : pr.diff.toFixed(1) + (pr.profile?.suffix || 'kg')
  return (
    <Tag color="gold" style={{ marginInlineStart: 4 }}>
      🏆 {label}! +{diffStr}
    </Tag>
  )
}

export function ExerciseDoneBadge({ filled }) {
  if (!filled) return null
  return (
    <Tag color="success" style={{ marginInlineStart: 4 }}>
      ✓
    </Tag>
  )
}

export function ExerciseInputHint({ name, profile }) {
  const hint = getExerciseInputHint(name, profile)
  if (!hint) return null
  return (
    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginBottom: 4 }}>
      💡 {hint}
    </Text>
  )
}
