import React from 'react'
import { HelpSupportScreen } from './HelpSupportScreen'
import { SupportCasesListScreen } from './SupportCasesListScreen'
import { SupportCaseDetailScreen } from './SupportCaseDetailScreen'
import { SupportNewCaseScreen } from './SupportNewCaseScreen'
import type { SupportCaseDetailApi } from '../hooks/use-operator-support'

export type AccountSupportView = 'help' | 'cases' | 'case-detail' | 'case-new'

type Props = {
  view: AccountSupportView
  caseId: string | null
  caseNewOrigin: 'help' | 'cases'
  createdBanner: string | null
  onSetView: (v: AccountSupportView) => void
  onSetCaseId: (id: string | null) => void
  onSetCaseNewOrigin: (o: 'help' | 'cases') => void
  onSetCreatedBanner: (code: string | null) => void
  onBackToHub: () => void
}

export function AccountSupportFlow({
  view,
  caseId,
  caseNewOrigin,
  createdBanner,
  onSetView,
  onSetCaseId,
  onSetCaseNewOrigin,
  onSetCreatedBanner,
  onBackToHub,
}: Props) {
  if (view === 'help') {
    return (
      <HelpSupportScreen
        onBack={onBackToHub}
        onOpenCases={() => onSetView('cases')}
        onNewCase={() => {
          onSetCaseNewOrigin('help')
          onSetView('case-new')
        }}
      />
    )
  }

  if (view === 'cases') {
    return (
      <div className="flex flex-col gap-3">
        {createdBanner ? (
          <p className="rounded-xl border border-[var(--kura-border)] bg-[var(--kura-teal)]/10 px-3 py-2 text-[12px] font-semibold text-[var(--kura-teal-bright)]">
            Case {createdBanner} opened. Updates appear on this case and in your inbox.
          </p>
        ) : null}
        <SupportCasesListScreen
          onBack={() => {
            onSetCreatedBanner(null)
            onSetView('help')
          }}
          onOpenCase={(id) => {
            onSetCreatedBanner(null)
            onSetCaseId(id)
            onSetView('case-detail')
          }}
          onNewCase={() => {
            onSetCaseNewOrigin('cases')
            onSetView('case-new')
          }}
        />
      </div>
    )
  }

  if (view === 'case-detail' && caseId) {
    return (
      <SupportCaseDetailScreen
        caseId={caseId}
        openedNotice={createdBanner}
        onDismissOpenedNotice={() => onSetCreatedBanner(null)}
        onBack={() => {
          onSetCreatedBanner(null)
          onSetView('cases')
        }}
      />
    )
  }

  if (view === 'case-new') {
    return (
      <SupportNewCaseScreen
        onBack={() => onSetView(caseNewOrigin)}
        onCreated={(created: SupportCaseDetailApi) => {
          onSetCreatedBanner(created.code)
          onSetCaseId(created.id)
          onSetView('case-detail')
        }}
      />
    )
  }

  return null
}
