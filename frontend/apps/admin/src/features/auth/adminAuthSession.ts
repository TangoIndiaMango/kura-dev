const REMEMBER_KEY = 'kura_admin_remembered'

export interface RememberedAdmin {
  email: string
  name: string
  role: string
}

export function readRememberedAdmin(): RememberedAdmin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as RememberedAdmin
  } catch {
    return null
  }
}

export function writeRememberedAdmin(user: RememberedAdmin) {
  localStorage.setItem(
    REMEMBER_KEY,
    JSON.stringify({
      email: user.email.trim().toLowerCase(),
      name: user.name.trim(),
      role: user.role.trim(),
    }),
  )
}

export function clearRememberedAdmin() {
  localStorage.removeItem(REMEMBER_KEY)
}
