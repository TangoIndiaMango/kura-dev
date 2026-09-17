import React from 'react'
import { Skeleton } from '@mantine/core'
import {
  AccountProfileCard,
  AccountStatsRow,
} from './AccountProfileCard'
import { AccountMenuList } from './AccountMenuList'
import { ACCOUNT_MENU_ITEMS } from '../accountMenu'
import { useAccountImpact } from '../hooks/use-account-impact'
import type { OperatorProfile } from '../../../shared/session/operatorTypes'

type Props = {
  session: OperatorProfile
  darkModeOn: boolean
  onToggleDark: () => void
  onItemClick: (id: string) => void
}

export function AccountProfileTab({
  session,
  darkModeOn,
  onToggleDark,
  onItemClick,
}: Props) {
  const { impact, isPending } = useAccountImpact()

  const savedSince = impact?.saved_since
    ? `Since ${new Date(impact.saved_since).toLocaleDateString()}`
    : 'Estimate vs petrol'
  const swapsPerWeek = impact
    ? `${impact.swaps_per_week}/week`
    : '—'

  return (
    <>
      <AccountProfileCard
        initials={session.initials}
        name={session.name}
        kuraId={session.kuraId}
        phone={`+234 ${session.phone}`}
        verifiedLabel={session.verifiedLabel}
        kycStatus={session.kycStatus}
        profilePhotoUrl={session.profilePhotoUrl}
      />

      {isPending ? (
        <Skeleton height={96} radius="lg" />
      ) : (
        <AccountStatsRow
          savedNaira={impact?.saved_vs_petrol_kobo ?? 0}
          savedSince={savedSince}
          swapsCompleted={impact?.swaps_completed ?? 0}
          swapsPerWeek={swapsPerWeek}
        />
      )}

      <AccountMenuList
        items={[
          {
            id: 'identity',
            title:
              session.kycStatus === 'VERIFIED'
                ? 'Identity'
                : session.kycPhotosRequested
                  ? 'Upload ID photos'
                  : session.kycStatus === 'REJECTED'
                    ? 'Resubmit identity'
                    : session.kycStatus === 'PENDING'
                      ? 'Identity under review'
                      : 'Verify identity',
            subtitle: session.kycPhotosRequested
              ? 'Ops asked for front & back'
              : session.kycStatus === 'VERIFIED'
                ? session.verifiedLabel
                : session.kycStatus === 'PENDING'
                  ? 'Ops reviewing · swaps still open'
                  : 'Photos if ops asks for them',
          },
          ...ACCOUNT_MENU_ITEMS.filter((item) =>
            ['theme', 'pin', 'help', 'logout'].includes(item.id),
          ).map((item) => {
            if (item.id === 'theme') {
              return {
                ...item,
                subtitle: darkModeOn
                  ? 'On · instrument theme'
                  : 'Off · light surfaces',
              }
            }
            if (item.id === 'pin') {
              return {
                ...item,
                title: session.hasPin ? 'Change PIN' : 'Set PIN',
                subtitle: session.hasPin
                  ? 'Confirms swaps and protects your account'
                  : 'Required before you can log out or confirm swaps',
              }
            }
            return { ...item }
          }),
        ]}
        darkModeOn={darkModeOn}
        onToggleDark={onToggleDark}
        onItemClick={onItemClick}
      />
    </>
  )
}
