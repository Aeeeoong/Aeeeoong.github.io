const KEY_PREFIX = 'workout-record-draft:'

function draftKey(user) {
  return `${KEY_PREFIX}${user}`
}

export function saveRecordDraft(user, { date, type, exercises }) {
  if (!user) return null
  const savedAt = Date.now()
  localStorage.setItem(
    draftKey(user),
    JSON.stringify({ date, type, exercises, savedAt }),
  )
  return savedAt
}

export function loadRecordDraft(user) {
  if (!user) return null
  try {
    const raw = localStorage.getItem(draftKey(user))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearRecordDraft(user) {
  if (!user) return
  localStorage.removeItem(draftKey(user))
}

export function hasDraftContent(exercises) {
  if (!exercises?.length) return false
  return exercises.some((ex) => {
    if (ex.comment?.trim()) return true
    if (ex.mode === 'cardio') {
      const c = ex.cardio || {}
      return c.speed != null || c.minutes != null || c.incline != null
    }
    if (ex.mode === 'simple') {
      return ex.weight != null || ex.sets != null || ex.reps != null
    }
    const hasSet = (ex.setsDetail || []).some((s) => s.weight != null || s.reps != null)
    return hasSet
  })
}

export function formatDraftTime(savedAt) {
  if (!savedAt) return ''
  return new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function isValidDraft(draft) {
  return Boolean(draft?.exercises?.length && hasDraftContent(draft.exercises))
}
