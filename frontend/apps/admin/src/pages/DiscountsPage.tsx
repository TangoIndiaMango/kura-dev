import { useLocation, useParams } from 'react-router-dom'
import {
  DiscountFormPanel,
  DiscountPersonDetailPanel,
  DiscountsDetailPanel,
  DiscountsPanel,
} from '@features/discounts'

export default function DiscountsPage() {
  const { id, userId } = useParams<{ id?: string; userId?: string }>()
  const { pathname } = useLocation()

  if (pathname.endsWith('/discounts/new') || id === 'new') return <DiscountFormPanel />
  if (pathname.endsWith('/edit') && id) return <DiscountFormPanel discountId={id} />
  if (id && userId) {
    return <DiscountPersonDetailPanel discountId={id} userId={userId} />
  }
  if (id) return <DiscountsDetailPanel id={id} />
  return <DiscountsPanel />
}
