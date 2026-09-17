import { useEffect, useState } from 'react'
import { Button, Group, Stack } from '@mantine/core'
import { DetailsDrawer } from '../DetailsDrawer'
import {
  createEmptyFilterValues,
  TableFilterField,
} from './TableFilterFields'
import type { TableFilterModalProps, TableFilterValues } from './types'

export function TableFilterModal({
  opened,
  onClose,
  fields,
  value,
  onApply,
  onReset,
  title = 'Filter Table Data',
  applyLabel = 'Filter Data',
  resetLabel = 'Reset',
}: TableFilterModalProps) {
  const [draft, setDraft] = useState<TableFilterValues>(() =>
    createEmptyFilterValues(fields),
  )

  useEffect(() => {
    if (!opened) return
    setDraft({
      ...createEmptyFilterValues(fields),
      ...value,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync draft when opened
  }, [opened])

  const handleApply = () => {
    onApply(draft)
    onClose()
  }

  const handleReset = () => {
    const empty = createEmptyFilterValues(fields)
    setDraft(empty)
    if (onReset) onReset()
    else onApply(empty)
  }

  return (
    <DetailsDrawer
      opened={opened}
      onClose={onClose}
      title={title}
      size={440}
      footer={
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={handleReset}
            styles={{
              root: {
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
                fontWeight: 600,
                minWidth: 100,
              },
            }}
          >
            {resetLabel}
          </Button>
          <Button
            color="brand"
            onClick={handleApply}
            styles={{
              root: {
                backgroundColor: 'var(--pr)',
                fontWeight: 600,
                minWidth: 120,
              },
            }}
          >
            {applyLabel}
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
        {fields.map((field) => (
          <TableFilterField
            key={field.key}
            field={field}
            value={draft[field.key] ?? null}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, [field.key]: next }))
            }
          />
        ))}
      </Stack>
    </DetailsDrawer>
  )
}
