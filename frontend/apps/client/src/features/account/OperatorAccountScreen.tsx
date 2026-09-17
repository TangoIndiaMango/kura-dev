import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMantineColorScheme } from '@mantine/core'
import type { TabId } from '../layout/FloatingGlassBottomBar'
import {
  DEFAULT_OPERATOR_SETTINGS,
  useOperatorSession,
} from '../../shared/session'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { AccountHubTabs, type AccountHubTab } from './components/AccountHubTabs'
import { AccountSettingsScreen } from './components/AccountSettingsScreen'
import { MyVehiclesScreen } from './components/MyVehiclesScreen'
import { AddVehicleStep } from '../swap/components/AddVehicleStep'
import { StoredEngineScreen } from './components/StoredEngineScreen'
import { PaymentMethodsScreen } from './components/PaymentMethodsScreen'
import { ChangePinScreen } from './components/ChangePinScreen'
import { DisplayNameScreen } from './components/DisplayNameScreen'
import { VerifyIdentityScreen } from './components/VerifyIdentityScreen'
import {
  AccountSupportFlow,
  type AccountSupportView,
} from './components/AccountSupportFlow'
import { AccountProfileTab } from './components/AccountProfileTab'
import { useAccountVehicles } from './hooks/use-account-vehicles'
import { useMyEngines } from './hooks/use-account-engines'
import { useAuth } from '../auth/AuthProvider'

type AccountView =
  | 'hub'
  | 'add-vehicle'
  | 'pin'
  | 'name'
  | 'identity'
  | AccountSupportView

interface OperatorAccountScreenProps {
  onNavigateTab: (tab: TabId) => void
}

export const OperatorAccountScreen: React.FC<OperatorAccountScreenProps> = ({
  onNavigateTab: _onNavigateTab,
}) => {
  const navigate = useNavigate()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const darkModeOn = colorScheme !== 'light'
  const [hubTab, setHubTab] = useState<AccountHubTab>('profile')
  const [caseId, setCaseId] = useState<string | null>(() => {
    if (sessionStorage.getItem('kura_account_open') === 'case') {
      return sessionStorage.getItem('kura_account_case_id')
    }
    return null
  })
  const [view, setView] = useState<AccountView>(() => {
    const open = sessionStorage.getItem('kura_account_open')
    if (open === 'identity' || open === 'pin' || open === 'name') {
      sessionStorage.removeItem('kura_account_open')
      return open
    }
    if (open === 'case') {
      sessionStorage.removeItem('kura_account_open')
      sessionStorage.removeItem('kura_account_case_id')
      return 'case-detail'
    }
    return 'hub'
  })
  const [caseNewOrigin, setCaseNewOrigin] = useState<'help' | 'cases'>('help')
  const [createdBanner, setCreatedBanner] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [needPinOpen, setNeedPinOpen] = useState(false)
  const { session, logout, updateSettings, setEmail } = useOperatorSession()
  const { refreshProfile } = useAuth()
  const { displayVehicles, loading: vehiclesLoading, page, setPage, totalPages, count, refetch } =
    useAccountVehicles()
  const { engines: myEngines, isPending: enginesPending } = useMyEngines({
    enabled: Boolean(session),
  })
  const showEngineTab = enginesPending || myEngines.length > 0

  useEffect(() => {
    if (!enginesPending && myEngines.length === 0 && hubTab === 'engine') {
      setHubTab('profile')
    }
  }, [enginesPending, myEngines.length, hubTab])

  if (!session) return null

  if (view === 'add-vehicle') {
    return (
      <AddVehicleStep
        onBack={() => {
          setHubTab('vehicles')
          setView('hub')
        }}
        submitLabel="Add vehicle"
        subtitle="Pick a catalogue model and your plate — saved only to your account."
        onAdded={async () => {
          await refetch()
          setHubTab('vehicles')
          setView('hub')
        }}
      />
    )
  }

  if (view === 'pin') {
    return (
      <ChangePinScreen
        onBack={() => {
          setHubTab('profile')
          setView('hub')
        }}
      />
    )
  }
  if (view === 'name') {
    return (
      <DisplayNameScreen
        initialName={session.name === 'Rider' ? '' : session.name}
        onBack={() => {
          setHubTab('profile')
          setView('hub')
        }}
        onSaved={() => {
          refreshProfile().then(() => {
            setHubTab('profile')
            setView('hub')
          })
        }}
      />
    )
  }
  if (view === 'identity') {
    return (
      <VerifyIdentityScreen
        onBack={() => {
          setHubTab('profile')
          setView('hub')
        }}
        current={session}
        onSubmit={async () => {
          await refreshProfile()
        }}
      />
    )
  }
  if (view === 'help' || view === 'cases' || view === 'case-detail' || view === 'case-new') {
    return (
      <AccountSupportFlow
        view={view}
        caseId={caseId}
        caseNewOrigin={caseNewOrigin}
        createdBanner={createdBanner}
        onSetView={setView}
        onSetCaseId={setCaseId}
        onSetCaseNewOrigin={setCaseNewOrigin}
        onSetCreatedBanner={setCreatedBanner}
        onBackToHub={() => {
          setHubTab('profile')
          setView('hub')
        }}
      />
    )
  }

  const doLogout = async () => {
    await logout()
    navigate('/onboarding', { replace: true })
  }

  const requestLogout = () => {
    if (!session.hasPin) {
      setNeedPinOpen(true)
      return
    }
    setLogoutOpen(true)
  }

  const onItemClick = (id: string) => {
    if (id === 'logout') {
      requestLogout()
      return
    }
    if (id === 'pin') setView('pin')
    if (id === 'identity') setView('identity')
    if (id === 'help') setView('help')
    if (id === 'name') setView('name')
  }

  const settings = session.settings ?? DEFAULT_OPERATOR_SETTINGS

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--kura-text)]">Account</h2>

      <AccountHubTabs
        active={hubTab}
        onChange={setHubTab}
        showEngineTab={showEngineTab}
      />

      {hubTab === 'profile' ? (
        <AccountProfileTab
          session={session}
          darkModeOn={darkModeOn}
          onToggleDark={() => setColorScheme(darkModeOn ? 'light' : 'dark')}
          onItemClick={onItemClick}
        />
      ) : null}

      {hubTab === 'vehicles' ? (
        <MyVehiclesScreen
          onBack={() => setHubTab('profile')}
          onAddVehicle={() => setView('add-vehicle')}
          loading={vehiclesLoading}
          vehicles={displayVehicles}
          page={page}
          totalPages={totalPages}
          count={count}
          onPageChange={setPage}
          embedded
        />
      ) : null}

      {hubTab === 'payments' ? (
        <PaymentMethodsScreen
          onBack={() => setHubTab('profile')}
          embedded
        />
      ) : null}

      {hubTab === 'engine' ? (
        <StoredEngineScreen
          onBack={() => setHubTab('profile')}
          embedded
          active={hubTab === 'engine'}
        />
      ) : null}

      {hubTab === 'settings' ? (
        <AccountSettingsScreen
          settings={settings}
          email={session.email}
          emailVerified={session.emailVerified}
          onUpdate={updateSettings}
          onSaveEmail={(value) => setEmail(value, true)}
          onClearEmail={() => setEmail(null, false)}
        />
      ) : null}

      <ConfirmDialog
        opened={logoutOpen}
        title="Log out?"
        description="You will sign back in with your phone number and your PIN. We only send a code when it is a new sign-in."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={doLogout}
      />

      <ConfirmDialog
        opened={needPinOpen}
        title="Set a PIN first"
        description="You need a 4-digit PIN before logging out so you can unlock this device when you return."
        confirmLabel="Set PIN"
        cancelLabel="Cancel"
        onCancel={() => setNeedPinOpen(false)}
        onConfirm={() => {
          setNeedPinOpen(false)
          setView('pin')
        }}
      />
    </div>
  )
}
