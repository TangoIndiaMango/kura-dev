import { useNavigate } from 'react-router-dom'
import { Text } from '@mantine/core'
import { AdminDetailPage } from '@shared/components'
import { useDiscount } from './hooks/use-discounts'

export function DiscountPersonDetailPanel({
  discountId,
  userId,
}: {
  discountId: string
  userId: string
}) {
  const navigate = useNavigate()
  const { discount } = useDiscount(discountId)

  return (
    <AdminDetailPage
      onBack={() => navigate(`/discounts/${discountId}`)}
      backLabel="Back to discount"
      title="Redemption detail"
      subtitle={discount?.name ?? discountId}
      summaryRows={[
        { label: 'Discount', value: discount?.code ?? discountId },
        { label: 'Person / account', value: userId },
      ]}
    >
      <Text size="sm" c="dimmed">
        Per-operator redemption history is not available on this screen. Use the
        discount detail for overall redemption counts.
      </Text>
    </AdminDetailPage>
  )
}
