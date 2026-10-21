import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  apiErrorMessage,
  AUTH_ME_QUERY_KEY,
  updateConsent,
  type MePayload,
} from '../../../lib/api/auth'
import { KuraIllustrationModal } from '../../../shared/components'
import { useAuth } from '../../auth/AuthProvider'
import { ConsentCheckboxes } from './ConsentCheckboxes'

/**
 * Riders who gave ID data before consent capture (or whose terms version is
 * out of date) confirm SERVICE on their next sign-in. New riders consent on
 * the identity form instead, so `prompt_required` stays false for them.
 */
export function ServiceConsentGate() {
  const queryClient = useQueryClient()
  const { me, logout } = useAuth()
  const [service, setService] = useState(false)
  const [dataSharing, setDataSharing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!me?.consent?.prompt_required) return null

  const confirm = async () => {
    if (!service) {
      setError('Agree to the service terms to keep using KURA.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      let next = await updateConsent('SERVICE', true)
      if (dataSharing) next = await updateConsent('DATA_SHARING', true)
      queryClient.setQueryData<MePayload>(AUTH_ME_QUERY_KEY, (old) =>
        old ? { ...old, consent: next } : old,
      )
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save your consent'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <KuraIllustrationModal
      opened
      onClose={() => undefined}
      dismissible={false}
      closeOnClickOutside={false}
      illustrationId="account-verified"
      title="Updated terms"
      description="We now keep a record of your consent. Confirm to keep swapping. You can change data sharing later in Account → Settings."
      primaryAction={{ label: 'Continue', onClick: confirm, loading: busy }}
      secondaryAction={{ label: 'Log out', onClick: () => void logout(), disabled: busy }}
    >
      <div className="flex flex-col gap-2 text-left">
        <ConsentCheckboxes
          service={service}
          onService={setService}
          dataSharing={dataSharing}
          onDataSharing={setDataSharing}
        />
        {error ? (
          <p className="text-[12px] font-medium text-[var(--kura-coral)]">{error}</p>
        ) : null}
      </div>
    </KuraIllustrationModal>
  )
}
