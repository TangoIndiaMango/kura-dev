import { useLocation } from 'react-router-dom'
import { ProfileEditPanel, ProfilePanel } from '@features/profile/ProfilePanel'

export default function ProfilePage() {
  const { pathname } = useLocation()
  if (pathname.endsWith('/profile/edit')) return <ProfileEditPanel />
  return <ProfilePanel />
}
