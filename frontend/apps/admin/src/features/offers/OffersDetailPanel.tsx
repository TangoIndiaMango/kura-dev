import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, TextInput, Text, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  AdminConfirmModal,
  AdminDetailPage,
  DetailPageLoadingSkeleton,
  IllustratedFormModal,
  KuraIllustrationModal,
  type AdminDetailAction,
} from '@shared/components'
import {
  illustrationSrc,
  type KuraIllustrationId,
} from '@shared/illustrations/catalog'
import {
  useAssignOffer,
  useOffer,
  useUpdateOffer,
} from './hooks/use-offers'
import {
  offerTermsFacts,
  offerTone,
  offerTypeBlurb,
  offerTypeLabel,
  segmentLabel,
  termsLabelFrom,
} from './offerHelpers'
import type { OfferStatus } from './types'

type ActionId = 'resume' | 'pause' | 'end' | 'publish' | 'assign'

const ACTION_META: Record<
  ActionId,
  { confirmTitle: string; confirmBody: string; illustrationId: KuraIllustrationId }
> = {
  publish: {
    confirmTitle: 'Publish this offer?',
    confirmBody: 'Sets status to Active. Operators matching criteria can see it.',
    illustrationId: 'offer-published',
  },
  resume: {
    confirmTitle: 'Resume this offer?',
    confirmBody: 'Makes the offer visible again for new applies.',
    illustrationId: 'offer-published',
  },
  pause: {
    confirmTitle: 'Pause this offer?',
    confirmBody: 'Hides the offer from new applies. Existing assignments continue.',
    illustrationId: 'offer-paused',
  },
  end: {
    confirmTitle: 'End this offer?',
    confirmBody: 'Permanently closes the product for new assignments.',
    illustrationId: 'offer-ended',
  },
  assign: {
    confirmTitle: 'Assign offer?',
    confirmBody: 'Creates OFFERED assignments for the listed account IDs.',
    illustrationId: 'offer-published',
  },
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--su)]">
        {label}
      </div>
      <div className="mt-0.5 text-[13.5px] font-medium text-[var(--tx)]">{value}</div>
    </div>
  )
}

export function OffersDetailPanel({ id }: { id: string }) {
  const navigate = useNavigate()
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const { offer, isPending, isError, refetch } = useOffer(id)
  const update = useUpdateOffer(id)
  const assign = useAssignOffer(id)
  const [pending, setPending] = useState<ActionId | null>(null)
  const [success, setSuccess] = useState<ActionId | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [accountIdsRaw, setAccountIdsRaw] = useState('')

  if (isPending) return <DetailPageLoadingSkeleton />

  if (isError || !offer) {
    return (
      <AdminDetailPage
        backLabel="Back to offers"
        onBack={() => navigate('/offers')}
        title="Offer not found"
        summaryRows={[{ label: 'ID', value: id }]}
      />
    )
  }

  const status = offer.status as OfferStatus
  const meta = pending ? ACTION_META[pending] : success ? ACTION_META[success] : null

  const setStatus = (next: OfferStatus, action: ActionId) => {
    update.mutate(
      { status: next },
      {
        onSuccess: () => {
          setSuccess(action)
          refetch()
        },
        onError: () =>
          notifications.show({
            color: 'red',
            title: 'Update failed',
            message: 'Check offers:manage and master switch.',
          }),
      },
    )
  }

  const actions: AdminDetailAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      onClick: () => navigate(`/offers/${offer.id}/edit`),
    },
    {
      id: 'assign',
      label: 'Assign',
      onClick: () => setAssignOpen(true),
      disabled: status !== 'ACTIVE',
    },
  ]
  if (status === 'DRAFT') {
    actions.push({ id: 'publish', label: 'Publish', onClick: () => setPending('publish') })
  }
  if (status === 'ACTIVE') {
    actions.push({ id: 'pause', label: 'Pause', onClick: () => setPending('pause') })
  }
  if (status === 'PAUSED') {
    actions.push({ id: 'resume', label: 'Resume', onClick: () => setPending('resume') })
  }
  if (status !== 'ENDED') {
    actions.push({
      id: 'end',
      label: 'End offer',
      tone: 'danger',
      onClick: () => setPending('end'),
    })
  }

  const overview = (
    <div className="flex flex-col gap-6">
      <section>
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          Product
        </Text>
        <div className="grid gap-4 sm:grid-cols-2">
          <Fact label="Offer ID" value={offer.id} />
          <Fact
            label="Type"
            value={`${offerTypeLabel(offer.offer_type)} · ${offerTypeBlurb(offer.offer_type)}`}
          />
          <Fact label="Segment" value={segmentLabel(offer.segment_criteria)} />
          <Fact label="Summary" value={offer.summary || '—'} />
          <Fact label="Terms" value={termsLabelFrom(offer.terms)} />
        </div>
      </section>
      <section>
        <Text fw={700} size="sm" className="mb-3 text-[var(--tx)]">
          Commercial terms
        </Text>
        <div className="grid gap-4 sm:grid-cols-2">
          {offerTermsFacts(offer).map((f) => (
            <Fact key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      </section>
    </div>
  )

  return (
    <>
      <AdminDetailPage
        backLabel="Back to offers"
        onBack={() => navigate('/offers')}
        breadcrumbs={[
          { label: 'Product Offers', to: '/offers' },
          { label: offer.name },
        ]}
        title={offer.name}
        subtitle={`${offerTypeLabel(offer.offer_type)} · ${termsLabelFrom(offer.terms)}`}
        statusLabel={offer.status}
        statusTone={offerTone(offer.status)}
        actions={actions}
        tabs={[{ id: 'overview', label: 'Overview', content: overview }]}
      />

      <IllustratedFormModal
        opened={assignOpen}
        onClose={() => setAssignOpen(false)}
        illustration={illustrationSrc('offer-published', themeKey)}
        title="Assign offer"
        description="Comma or newline separated account UUIDs. Offer must be ACTIVE."
      >
        <TextInput
          label="Account IDs"
          value={accountIdsRaw}
          onChange={(e) => setAccountIdsRaw(e.currentTarget.value)}
          placeholder="uuid-1, uuid-2"
        />
        <Button
          mt="md"
          color="brand"
          disabled={!accountIdsRaw.trim()}
          loading={assign.isPending}
          onClick={() => setPending('assign')}
        >
          Continue
        </Button>
      </IllustratedFormModal>

      <AdminConfirmModal
        opened={!!pending}
        onClose={() => setPending(null)}
        title={meta?.confirmTitle ?? ''}
        body={meta?.confirmBody ?? ''}
        confirmLabel="Confirm"
        reasonRequired={pending === 'pause' || pending === 'end'}
        illustrationId="confirm-action"
        onConfirm={() => {
          const action = pending
          setPending(null)
          if (!action) return
          if (action === 'assign') {
            const ids = accountIdsRaw
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean)
            assign.mutate(
              { account_ids: ids, channel: 'APP' },
              {
                onSuccess: (res) => {
                  setAssignOpen(false)
                  setSuccess('assign')
                  notifications.show({
                    color: 'teal',
                    title: 'Assigned',
                    message: `${res.assigned} account(s).`,
                  })
                },
                onError: () =>
                  notifications.show({
                    color: 'red',
                    title: 'Assign failed',
                    message: 'Only ACTIVE offers can be assigned.',
                  }),
              },
            )
            return
          }
          if (action === 'publish' || action === 'resume') setStatus('ACTIVE', action)
          if (action === 'pause') setStatus('PAUSED', action)
          if (action === 'end') setStatus('ENDED', action)
        }}
      />

      <KuraIllustrationModal
        opened={!!success}
        onClose={() => setSuccess(null)}
        illustrationId={success ? ACTION_META[success].illustrationId : 'offer-published'}
        title={
          success === 'pause'
            ? 'Offer paused'
            : success === 'resume' || success === 'publish'
              ? 'Offer live'
              : success === 'end'
                ? 'Offer ended'
                : success === 'assign'
                  ? 'Assignments created'
                  : 'Done'
        }
        description={offer.name}
        primaryAction={{ label: 'Done', onClick: () => setSuccess(null) }}
      />
    </>
  )
}
