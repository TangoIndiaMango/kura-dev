import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, PasswordInput, Skeleton, Text } from '@mantine/core'
import { AuthShell } from './AuthShell'
import { KuraIllustrationModal } from '@shared/components'
import { writeRememberedAdmin } from './adminAuthSession'
import {
  apiErrorMessage,
  completePasswordSetup,
  fetchPasswordSetupContext,
} from '../../lib/api/auth'
import { useAuth } from './AuthProvider'

function rule(ok: boolean, label: string) {
  return (
    <li
      className={`text-[12px] ${ok ? 'font-semibold text-[#1B7A3E]' : 'text-[var(--mu)]'}`}
    >
      {ok ? '✓' : '·'} {label}
    </li>
  )
}

export function CreatePasswordPage() {
  const navigate = useNavigate()
  const { setAuthenticatedFromTokens } = useAuth()
  const [params] = useSearchParams()
  const token = (params.get('token') || '').trim()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ctxLoading, setCtxLoading] = useState(Boolean(token))
  const [email, setEmail] = useState(params.get('email') || '')
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    if (!token) {
      setCtxLoading(false)
      setError('This invite link is missing a token. Open the link from your email.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const ctx = await fetchPasswordSetupContext(token)
        if (cancelled) return
        setEmail(ctx.email || '')
        setFirstName(ctx.first_name || '')
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, 'This invite link is invalid or expired.'))
        }
      } finally {
        if (!cancelled) setCtxLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const checks = useMemo(
    () => ({
      len: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      num: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      match: password.length > 0 && password === confirm,
    }),
    [password, confirm],
  )

  const ready = Object.values(checks).every(Boolean) && Boolean(token)

  const submit = async () => {
    setError(null)
    if (!token) {
      setError('Invite token is required.')
      return
    }
    if (!Object.values(checks).every(Boolean)) {
      setError('Meet all password rules before continuing.')
      return
    }
    setLoading(true)
    try {
      const result = await completePasswordSetup({
        token,
        password,
        password_confirmation: confirm,
      })
      await setAuthenticatedFromTokens()
      const name =
        [result.user.first_name, result.user.last_name].filter(Boolean).join(' ') ||
        firstName ||
        email.split('@')[0] ||
        'Admin'
      writeRememberedAdmin({
        email: result.user.email || email,
        name,
        role: result.user.role || 'Staff',
      })
      setSuccess(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <AuthShell
        footer={
          <Link to="/login" className="font-semibold text-[var(--pr)] hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div>
          <h2 className="m-0 mb-2 text-[24px] font-bold tracking-tight text-[var(--tx)]">
            Create password
          </h2>
          {ctxLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton height={16} width="60%" />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {email ? (
                <Text size="sm" c="dimmed">
                  Setting password for <strong>{email}</strong>
                </Text>
              ) : null}
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                disabled={!token}
              />
              <PasswordInput
                label="Confirm password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.currentTarget.value)}
                disabled={!token}
              />
              <ul className="m-0 list-none space-y-1 p-0">
                {rule(checks.len, 'At least 8 characters')}
                {rule(checks.upper, 'One uppercase letter')}
                {rule(checks.lower, 'One lowercase letter')}
                {rule(checks.num, 'One number')}
                {rule(checks.special, 'One special character')}
                {rule(checks.match, 'Passwords match')}
              </ul>
              {error ? (
                <p className="text-[13px] font-medium text-[#C0392B]" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                className="h-11 bg-[var(--pr)] hover:opacity-90"
                disabled={!ready || loading || ctxLoading}
                loading={loading}
                onClick={submit}
              >
                Save and continue
              </Button>
            </div>
          )}
        </div>
      </AuthShell>

      <KuraIllustrationModal
        opened={success}
        onClose={() => setSuccess(false)}
        illustrationId="offer-published"
        title="Password set"
        description="You’re signed in to the console."
        primaryAction={{
          label: 'Open console',
          onClick: () => navigate('/', { replace: true }),
        }}
      />
    </>
  )
}
