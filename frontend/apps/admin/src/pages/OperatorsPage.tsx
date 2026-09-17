import { useLocation, useParams } from 'react-router-dom'
import {
  OperatorFormPanel,
  OperatorsDetailPanel,
  OperatorsPanel,
} from '@features/operators'

export default function OperatorsPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()
  const isEdit = Boolean(id && pathname.endsWith('/edit'))

  if (id === 'new') return <OperatorFormPanel />
  if (isEdit && id) return <OperatorFormPanel operatorId={id} />
  if (id) return <OperatorsDetailPanel id={id} />
  return <OperatorsPanel />
}
