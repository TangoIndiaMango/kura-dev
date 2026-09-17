import { useParams, useLocation } from 'react-router-dom'
import {
  RoleDetailPanel,
  RoleFormPanel,
  UserFormPanel,
  UsersDetailPanel,
  UsersPanel,
} from '@features/users'

export default function UsersPage() {
  const { id, code } = useParams<{ id?: string; code?: string }>()
  const { pathname } = useLocation()

  if (pathname.includes('/roles/') && pathname.endsWith('/edit') && code) {
    return <RoleFormPanel roleCode={code} />
  }
  if (pathname.includes('/roles/new')) {
    const params = new URLSearchParams(window.location.search)
    const duplicate = params.get('duplicate')
    return <RoleFormPanel duplicateFrom={duplicate} />
  }
  if (pathname.includes('/roles/') && (code || id)) return <RoleDetailPanel />
  if (pathname.endsWith('/users/new') || id === 'new') return <UserFormPanel />
  if (id && pathname.endsWith('/edit')) return <UserFormPanel userId={id} />
  if (id) return <UsersDetailPanel />
  return <UsersPanel />
}
