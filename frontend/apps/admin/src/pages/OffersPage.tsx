import { useLocation, useParams } from 'react-router-dom'
import { OffersPanel, OffersDetailPanel, OfferFormPanel } from '@features/offers'

export default function OffersPage() {
  const { id } = useParams<{ id?: string }>()
  const { pathname } = useLocation()

  if (pathname.endsWith('/offers/new') || id === 'new') return <OfferFormPanel />
  if (pathname.endsWith('/edit') && id) return <OfferFormPanel offerId={id} />
  if (id) return <OffersDetailPanel id={id} />
  return <OffersPanel />
}
