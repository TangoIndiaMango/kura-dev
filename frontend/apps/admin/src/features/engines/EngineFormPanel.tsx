import { Text } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import { SidebarFormLayout } from '@shared/components'
import { useCapabilities } from '../auth/useCapabilities'
import { EngineFormCreate } from './EngineFormCreate'
import { ENGINE_FORM_TIPS } from './engineFormTips'

export function EngineFormPanel({
  resumeRetrofitId,
}: {
  resumeRetrofitId?: string
}) {
  const navigate = useNavigate()
  const { can } = useCapabilities()

  if (!can('engines:manage')) {
    return (
      <SidebarFormLayout
        sidebarTitle="New retrofit"
        sidebarSubtitle="Retrofit & Engines"
        sidebarTips={ENGINE_FORM_TIPS}
        onClose={() => navigate('/engines')}
        headerActionLabel="Close ×"
      >
        <Text size="sm">You need engines:manage to create retrofit jobs.</Text>
      </SidebarFormLayout>
    )
  }

  return <EngineFormCreate resumeRetrofitId={resumeRetrofitId} />
}
