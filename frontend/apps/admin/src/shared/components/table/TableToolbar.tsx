import { Button, Group, Menu, Text, TextInput } from '@mantine/core'
import { ArrowDown01Icon, Download01Icon, FilterIcon, Search01Icon } from 'hugeicons-react'
import type { TableToolbarConfig } from './types'

export function TableToolbar({
  title,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search',
  showFilter = true,
  showExport = false,
  onFilter,
  onExport,
  onExportFormat,
  isExporting = false,
  actions,
}: TableToolbarConfig) {
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="wrap"
      gap="md"
      px="md"
      py="md"
      className="border-b border-[var(--bd)]"
    >
      <Text fw={600} fz="lg" c="var(--tx)">
        {title}
      </Text>

      <Group gap="sm" wrap="wrap" className="w-full sm:w-auto">
        {onSearchChange && (
          <TextInput
            placeholder={searchPlaceholder}
            value={searchQuery ?? ''}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            leftSection={<Search01Icon size={16} color="var(--mu)" />}
            className="w-full sm:w-[280px]"
            radius="md"
            styles={{
              input: {
                backgroundColor: 'var(--in)',
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
              },
            }}
          />
        )}

        {showFilter && (
          <Button
            variant="default"
            leftSection={<FilterIcon size={16} />}
            onClick={onFilter}
            styles={{
              root: {
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
                backgroundColor: 'var(--sf)',
                fontWeight: 500,
              },
            }}
          >
            Filter
          </Button>
        )}

        {showExport && onExportFormat ? (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button
                variant="default"
                leftSection={<Download01Icon size={16} />}
                rightSection={<ArrowDown01Icon size={16} />}
                loading={isExporting}
                disabled={isExporting}
                styles={{
                  root: {
                    borderColor: 'var(--bd)',
                    color: 'var(--tx)',
                    backgroundColor: 'var(--sf)',
                    fontWeight: 500,
                  },
                }}
              >
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => onExportFormat('csv')}>
                Export as CSV
              </Menu.Item>
              <Menu.Item onClick={() => onExportFormat('pdf')}>
                Export as PDF
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : null}

        {showExport && !onExportFormat ? (
          <Button
            variant="default"
            leftSection={<Download01Icon size={16} />}
            onClick={onExport}
            loading={isExporting}
            disabled={isExporting}
            styles={{
              root: {
                borderColor: 'var(--bd)',
                color: 'var(--tx)',
                backgroundColor: 'var(--sf)',
                fontWeight: 500,
              },
            }}
          >
            Export
          </Button>
        ) : null}

        {actions}
      </Group>
    </Group>
  )
}
