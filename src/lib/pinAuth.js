const PIN_MIN = 4
const PIN_MAX = 8

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function validatePinFormat(pin) {
  if (!pin || !/^\d+$/.test(pin)) return 'PIN은 숫자만 입력할 수 있습니다.'
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) {
    return `PIN은 ${PIN_MIN}~${PIN_MAX}자리 숫자입니다.`
  }
  return null
}

export function generatePinSalt() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return toHex(hash)
}

export async function verifyPin(pin, salt, expectedHash) {
  if (!salt || !expectedHash) return false
  const hash = await hashPin(pin, salt)
  return hash === expectedHash
}
