import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert, Button, PasswordInput, TextInput } from '@mantine/core'
import { AuthShell, AuthShellSkeleton } from './AuthShell'
import {
  clearRememberedAdmin,
  readRememberedAdmin,
  writeRememberedAdmin,
  type RememberedAdmin,
} from './adminAuthSession'
import { apiErrorMessage, staffLogin } from '../../lib/api/auth'
import { useAuth } from './AuthProvider'
import { staffHomePath } from './staffHomePath'

const MAX_ATTEMPTS = 5
const LOCK_MS = 60_000

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, me, setAuthenticatedFromTokens, clearSession } =
    useAuth()
  const [params] = useSearchParams()
  const sessionExpired = params.get('reason') === 'session_expired'
  const nextPath = params.get('next')

  const remembered = useMemo(() => readRememberedAdmin(), [])
  const [email, setEmail] = useState(remembered?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [switchAccount, setSwitchAccount] = useState(!remembered)

  useEffect(() => {
    setHydrated(true)
  }, [])

  if (!hydrated) return <AuthShellSkeleton />

  if (isAuthenticated) {
    return <Navigate to={staffHomePath(me, nextPath)} replace />
  }

  const locked = Date.now() < lockedUntil

  const signIn = async (values: {
    email: string
    password: string
    remembered?: RememberedAdmin
  }) => {
    setError(null)
    if (locked) {
      setError('Too many attempts. Wait a minute, then try again.')
      return
    }
    const trimmed = values.email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid work email.')
      return
    }
    if (values.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const result = await staffLogin(trimmed, values.password)
      const profile = await setAuthenticatedFromTokens()
      const name =
        [result.user.first_name, result.user.last_name].filter(Boolean).join(' ') ||
        values.remembered?.name ||
        trimmed.split('@')[0] ||
        'Admin'
      const role = result.user.role || values.remembered?.role || 'Staff'

      writeRememberedAdmin({ email: trimmed, name, role })
      navigate(staffHomePath(profile, nextPath), { replace: true })
    } catch (err) {
      const next = attempts + 1
      setAttempts(next)
      setPassword('')
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_MS)
        setError('Account temporarily locked on this device. Try again in 1 minute.')
      } else {
        setError(
          `${apiErrorMessage(err, 'Sign-in failed')} · ${MAX_ATTEMPTS - next} attempts left`,
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div>
        <h2 className="m-0 mb-6 text-[24px] font-bold tracking-tight text-[var(--tx)]">
          Sign in
        </h2>

        {sessionExpired ? (
          <Alert color="yellow" mb="md" title="Session expired">
            Sign in again to continue.
          </Alert>
        ) : null}

        {remembered && !switchAccount ? (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-[14px] border border-[var(--bd)] bg-[var(--in)] px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pr)]/15 text-[13px] font-bold text-[var(--pr)]">
                {remembered.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[var(--tx)]">{remembered.name}</p>
                <p className="truncate text-[12px] text-[var(--mu)]">
                  {remembered.role} · {remembered.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 text-[12px] font-semibold text-[var(--pr)]"
              onClick={() => {
                setSwitchAccount(true)
                setEmail('')
                setPassword('')
                clearRememberedAdmin()
                clearSession()
              }}
            >
              Switch
            </button>
          </div>
        ) : null}

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void signIn({
              email: remembered && !switchAccount ? remembered.email : email,
              password,
              remembered: remembered && !switchAccount ? remembered : undefined,
            })
          }}
          noValidate
        >
          {switchAccount || !remembered ? (
            <TextInput
              label="Work email"
              type="email"
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="ops@yopmail.com"
              disabled={loading || locked}
            />
          ) : null}

          <PasswordInput
            label="Password"
            autoComplete="current-password"
            autoFocus={Boolean(remembered && !switchAccount)}
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            placeholder="Your password"
            disabled={loading || locked}
          />

          <div className="-mt-1 flex justify-end">
            <Link
              to="/reset-password"
              className="text-[13px] font-semibold text-[var(--pr)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {error ? (
            <p className="m-0 text-[13px] font-medium text-[#C0392B]" role="alert" aria-live="polite">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="h-11 bg-[var(--pr)] hover:opacity-90"
            loading={loading}
            disabled={locked}
          >
            Sign in
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
