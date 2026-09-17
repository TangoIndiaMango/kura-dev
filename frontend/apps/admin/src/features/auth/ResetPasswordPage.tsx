import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, TextInput } from '@mantine/core'
import { AuthShell } from './AuthShell'
import { KuraIllustrationModal } from '@shared/components'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    setError(null)
    const trimmed = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter the work email on your account.')
      return
    }
    setSuccess(true)
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
          <h2 className="m-0 mb-6 text-[24px] font-bold tracking-tight text-[var(--tx)]">
            Reset password
          </h2>
          <div className="flex flex-col gap-3">
            <TextInput
              label="Work email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              placeholder="you@kura.africa"
            />
            {error ? (
              <p className="text-[13px] font-medium text-[#C0392B]" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="h-11 bg-[var(--pr)] hover:opacity-90" onClick={submit}>
              Send reset link
            </Button>
          </div>
        </div>
      </AuthShell>

      <KuraIllustrationModal
        opened={success}
        onClose={() => setSuccess(false)}
        illustrationId="note-added"
        title="Check your email"
        description="If an account exists for that address, a reset link is on the way."
        primaryAction={{
          label: 'Create password',
          onClick: () => {
            setSuccess(false)
            navigate('/create-password')
          },
        }}
        secondaryAction={{
          label: 'Back to sign in',
          onClick: () => navigate('/login'),
        }}
      />
    </>
  )
}
