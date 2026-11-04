import { useParams } from 'react-router-dom'
import { ReportBuilder } from '@features/reports/ReportBuilder'
import { ReportsPanel } from '@features/reports/ReportsPanel'

export default function ReportsPage() {
  const { dataset } = useParams<{ dataset?: string }>()
  if (dataset) return <ReportBuilder datasetCode={dataset} />
  return <ReportsPanel />
}
