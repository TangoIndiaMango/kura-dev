import React, { useState } from 'react'
import { OperatorBackHeader } from '../../../shared/components/operator/OperatorBackHeader'
import { OperatorPrimaryButton } from '../../../shared/components/operator/OperatorPrimaryButton'
import {
  apiErrorMessage,
  completeAccountProfile,
} from '../../../lib/api/auth'
import { useAuth } from '../../auth/AuthProvider'

interface DisplayNameScreenProps {
  initialName: string
  onBack: () => void
  onSaved: (name: string) => void
}

export const DisplayNameScreen: React.FC<DisplayNameScreenProps> = ({
  initialName,
  onBack,
  onSaved,
}) => {
  const { isAuthenticated } = useAuth()
  const [fullName, setFullName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = fullName.trim().length > 1

  return (
    <div className="flex flex-col gap-5">
      <OperatorBackHeader
        title="Your name"
        subtitle="How hubs and your wallet will address you."
        onBack={onBack}
      />

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-[var(--kura-muted)]">
          Full name
        </span>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Yusuf Abdullahi"
          className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3.5 text-[15px] font-medium text-[var(--kura-text)] outline-none placeholder:text-[var(--kura-text)]/35 focus:border-[var(--kura-teal)]"
        />
      </label>

      {error ? (
        <p className="text-[12px] font-medium text-[var(--kura-coral)]">{error}</p>
      ) : null}

      <OperatorPrimaryButton
        disabled={!ready}
        loading={loading}
        onClick={() => {
          void (async () => {
            const name = fullName.trim()
            setError(null)
            setLoading(true)
            try {
              if (isAuthenticated) {
                await completeAccountProfile({ display_name: name })
              }
              onSaved(name)
            } catch (err) {
              setError(apiErrorMessage(err, 'Could not save name'))
            } finally {
              setLoading(false)
            }
          })()
        }}
      >
        Save
      </OperatorPrimaryButton>
    </div>
  )
}
