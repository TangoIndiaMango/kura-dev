import { useParams } from 'react-router-dom'
import { TelemetryDetailPanel, TelemetryPanel } from '@features/telemetry'

export default function TelemetryPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <TelemetryDetailPanel />
  return <TelemetryPanel />
}
