import { Tag, Typography } from 'antd'
import { compareWithPrevious } from '../lib/workoutInsights'

const { Text } = Typography

export function ExerciseCompareHint({ current, previous }) {
  const parts = compareWithPrevious(current, previous)
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

export function PersonalBestBadge({ pr }) {
  if (!pr) return null
  return (
    <Tag color="gold" style={{ marginInlineStart: 4 }}>
      🏆 역대 최고! +{pr.diff.toFixed(1)}kg
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
