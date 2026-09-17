import { Button, Select, useMantineColorScheme } from '@mantine/core'
import {
  AdminConfirmModal,
  IllustratedFormModal,
  KuraIllustrationModal,
} from '@shared/components'
import { illustrationSrc } from '@shared/illustrations/catalog'
import {
  discountSelectOptionsFrom,
  formatDiscountValue,
  useDiscount,
  useSelectableDiscounts,
} from '@features/discounts'
import { OPERATOR_ACTION_META } from './operatorActionMeta'
import { OperatorVerifyIdentityModal } from './OperatorVerifyIdentityModal'
import type { useOperatorDetailActions } from './hooks/use-operator-detail-actions'

type ActionsApi = ReturnType<typeof useOperatorDetailActions>

type Props = {
  operatorName: string
  operatorPhone: string
  discountId?: string
  draftDiscount: string | null
  setDraftDiscount: (v: string | null) => void
  draftHub: string | null
  setDraftHub: (v: string | null) => void
  assignDiscountOpen: boolean
  setAssignDiscountOpen: (v: boolean) => void
  createSwapOpen: boolean
  setCreateSwapOpen: (v: boolean) => void
  actionsApi: ActionsApi
  onDiscountSaved: (id: string | undefined) => void
  onNavigateSwaps: () => void
}

export function OperatorsDetailModals({
  operatorName,
  operatorPhone,
  discountId,
  draftDiscount,
  setDraftDiscount,
  draftHub,
  setDraftHub,
  assignDiscountOpen,
  setAssignDiscountOpen,
  createSwapOpen,
  setCreateSwapOpen,
  actionsApi,
  onDiscountSaved,
  onNavigateSwaps,
}: Props) {
  const { colorScheme } = useMantineColorScheme()
  const themeKey = colorScheme === 'dark' ? 'dark' : 'light'
  const hubOptions: Array<{ value: string; label: string }> = []
  const { discounts } = useSelectableDiscounts({ enabled: assignDiscountOpen })
  const { discount } = useDiscount(discountId, {
    enabled: Boolean(discountId) && actionsApi.success === 'assign-discount',
  })

  const meta = actionsApi.pending
    ? OPERATOR_ACTION_META[actionsApi.pending]
    : actionsApi.success && actionsApi.success !== 'assign-discount'
      ? OPERATOR_ACTION_META[actionsApi.success]
      : null

  return (
    <>
      {assignDiscountOpen ? (
        <IllustratedFormModal
          opened
          onClose={() => setAssignDiscountOpen(false)}
          illustration={illustrationSrc('offer-published', themeKey)}
          title="Issue discount"
          description="Operator must enter the code at checkout."
        >
          <Select
            label="Discount"
            data={discountSelectOptionsFrom(discounts)}
            value={draftDiscount}
            onChange={setDraftDiscount}
            searchable
          />
          <Button
            mt="md"
            color="brand"
            onClick={() => {
              onDiscountSaved(draftDiscount || undefined)
              setAssignDiscountOpen(false)
              actionsApi.setSuccess('assign-discount')
            }}
          >
            Save & notify
          </Button>
        </IllustratedFormModal>
      ) : null}

      {createSwapOpen ? (
        <IllustratedFormModal
          opened
          onClose={() => setCreateSwapOpen(false)}
          illustration={illustrationSrc('swap-complete', themeKey)}
          title="Create swap"
          description="Reserve a manual swap session."
        >
          <Select
            label="Hub"
            data={hubOptions}
            value={draftHub}
            onChange={setDraftHub}
            searchable
          />
          <Button
            mt="md"
            color="brand"
            disabled={!draftHub}
            onClick={() => {
              setCreateSwapOpen(false)
              actionsApi.setSuccess('create-swap')
            }}
          >
            Create swap
          </Button>
        </IllustratedFormModal>
      ) : null}

      {actionsApi.pending === 'verify-identity' ? (
        <OperatorVerifyIdentityModal
          opened
          loading={actionsApi.isPending}
          onClose={() => actionsApi.setPending(null)}
          onConfirm={actionsApi.runVerify}
        />
      ) : null}

      {actionsApi.pending && actionsApi.pending !== 'verify-identity' && meta ? (
        <AdminConfirmModal
          opened
          onClose={() => actionsApi.setPending(null)}
          title={meta.confirmTitle}
          body={meta.confirmBody}
          confirmTone={meta.confirmTone}
          reasonRequired={
            actionsApi.pending === 'suspend' ? true : meta.reasonRequired
          }
          reasonLabel={meta.reasonLabel}
          reasonPlaceholder={meta.reasonPlaceholder}
          confirmLabel={meta.confirmLabel ?? 'Confirm'}
          illustrationId={meta.illustrationId}
          loading={actionsApi.isPending}
          onConfirm={actionsApi.runConfirm}
        />
      ) : null}

      {actionsApi.success === 'assign-discount' ? (
        <KuraIllustrationModal
          opened
          onClose={() => actionsApi.setSuccess(null)}
          illustrationId="offer-published"
          title="Discount code issued"
          description={
            discount
              ? `${discount.name} · ${formatDiscountValue(discount)}`
              : 'Grant cleared.'
          }
          primaryAction={{
            label: 'Done',
            onClick: () => actionsApi.setSuccess(null),
          }}
        />
      ) : null}

      {actionsApi.success && meta && actionsApi.success !== 'assign-discount' ? (
        <KuraIllustrationModal
          opened
          onClose={() => actionsApi.setSuccess(null)}
          illustrationId={meta.illustrationId}
          title={meta.successTitle}
          description={meta.successBody(operatorName, operatorPhone)}
          primaryAction={{
            label: actionsApi.success === 'create-swap' ? 'View swaps' : 'Done',
            onClick: () => {
              if (actionsApi.success === 'create-swap') onNavigateSwaps()
              actionsApi.setSuccess(null)
            },
          }}
        />
      ) : null}
    </>
  )
}
