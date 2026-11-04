import { Navigate, useLocation, useParams } from 'react-router-dom'
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
  // Riders have nothing staff edit here: the chairman lives on the vehicle.
  if (isEdit && id) return <Navigate to={`/operators/${id}`} replace />
  if (id) return <OperatorsDetailPanel id={id} />
  return <OperatorsPanel />
}
