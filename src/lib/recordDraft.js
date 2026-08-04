const KEY_PREFIX = 'workout-record-draft:'

function draftKey(user) {
  return `${KEY_PREFIX}${user}`
}

export function saveRecordDraft(user, { date, type, exercises }) {
  if (!user) return
  localStorage.setItem(
    draftKey(user),
    JSON.stringify({ date, type, exercises, savedAt: Date.now() }),
  )
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
  return exercises.some((ex) => {
    if (ex.comment?.trim()) return true
    if (ex.mode === 'simple') {
      return ex.weight != null || ex.sets != null || ex.reps != null
    }
    const hasSet = (ex.setsDetail || []).some((s) => s.weight != null || s.reps != null)
    return hasSet
  })
}
