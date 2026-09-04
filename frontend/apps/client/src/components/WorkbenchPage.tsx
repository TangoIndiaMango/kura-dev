import { useState, useMemo } from 'react'
import {
  Container,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Button,
  Paper,
  Box,
  SimpleGrid,
  Tabs,
  Code,
  Tooltip,
} from '@mantine/core'
import {
  ZapIcon,
  Calendar03Icon,
  FilterIcon,
  Tick01Icon,
  Alert02Icon,
  Download01Icon,
  Layers01Icon,
  TableIcon,
  Loading03Icon,
  ViewIcon,
} from 'hugeicons-react'

import {
  DynamicTableSection,
  TableStatusBadge,
  DateRangePicker,
  TableFilterModal,
  DetailsDrawer,
  IllustratedStatusModal,
  RouteLoadingFallback,
  CardGridSkeleton,
  DetailPageSkeleton,
  FormPageSkeleton,
  UnderlineTabs,
  PageBreadcrumb,
  GoBackLink,
  type TableHeader,
  type TableFilterFieldConfig,
  type TableFilterValues,
  type DetailsDrawerRow,
  type DateRangeOutput,
} from '../shared/components'

// Sample dataset demonstrating real table and filter behavior
interface SwapRecord {
  id: string
  station: string
  driver: string
  batteryIn: string
  batteryOut: string
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FLAGGED'
  date: string
  amount: string
  soc: number
}

const INITIAL_DATA: SwapRecord[] = [
  {
    id: 'SWP-9021',
    station: 'Yaba Central Mega Hub',
    driver: 'Babatunde Adeleke',
    batteryIn: 'KUR-BAT-1049 (14%)',
    batteryOut: 'KUR-BAT-2088 (100%)',
    status: 'COMPLETED',
    date: '2026-09-04 08:45',
    amount: '₦1,500',
    soc: 98,
  },
  {
    id: 'SWP-9022',
    station: 'Ikeja Computer Village Hub',
    driver: 'Chinedu Eze',
    batteryIn: 'KUR-BAT-0883 (19%)',
    batteryOut: 'KUR-BAT-3112 (96%)',
    status: 'COMPLETED',
    date: '2026-09-04 08:30',
    amount: '₦1,500',
    soc: 96,
  },
  {
    id: 'SWP-9023',
    station: 'Victoria Island Transit Point',
    driver: 'Fatima Aliyu',
    batteryIn: 'KUR-BAT-4402 (8%)',
    batteryOut: 'KUR-BAT-1194 (99%)',
    status: 'IN_PROGRESS',
    date: '2026-09-04 08:21',
    amount: '₦1,500',
    soc: 99,
  },
  {
    id: 'SWP-9024',
    station: 'Lekki Phase 1 Depot',
    driver: 'Oluwaseun Bakare',
    batteryIn: 'KUR-BAT-2291 (22%)',
    batteryOut: 'KUR-BAT-0922 (94%)',
    status: 'COMPLETED',
    date: '2026-09-04 08:05',
    amount: '₦1,500',
    soc: 94,
  },
  {
    id: 'SWP-9025',
    station: 'Surulere National Stadium Hub',
    driver: 'Emeka Nwosu',
    batteryIn: 'KUR-BAT-3301 (5%)',
    batteryOut: 'KUR-BAT-1422 (98%)',
    status: 'FLAGGED',
    date: '2026-09-04 07:50',
    amount: '₦2,200',
    soc: 98,
  },
  {
    id: 'SWP-9026',
    station: 'Oshodi Interchange Superhub',
    driver: 'Amina Yusuf',
    batteryIn: 'KUR-BAT-5512 (12%)',
    batteryOut: 'KUR-BAT-6731 (100%)',
    status: 'PENDING',
    date: '2026-09-04 07:35',
    amount: '₦1,500',
    soc: 100,
  },
]

const TABLE_HEADERS: TableHeader[] = [
  { key: 'id', label: 'Swap ID' },
  { key: 'station', label: 'Hub Station' },
  { key: 'driver', label: 'Driver / Account' },
  { key: 'battery', label: 'In / Out Batteries' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Timestamp' },
  { key: 'amount', label: 'Fee' },
  { key: 'action', label: 'Actions' },
]

const FILTER_FIELDS: TableFilterFieldConfig[] = [
  {
    key: 'status',
    label: 'Swap Status',
    type: 'multiCheckbox',
    presentation: 'popover',
    placeholder: 'Filter by status',
    options: [
      { label: 'Completed', value: 'COMPLETED' },
      { label: 'In Progress', value: 'IN_PROGRESS' },
      { label: 'Pending', value: 'PENDING' },
      { label: 'Flagged / Mismatch', value: 'FLAGGED' },
    ],
  },
  {
    key: 'station',
    label: 'Hub Station',
    type: 'select',
    placeholder: 'All Hubs',
    options: [
      { label: 'Yaba Central Mega Hub', value: 'Yaba Central Mega Hub' },
      { label: 'Ikeja Computer Village Hub', value: 'Ikeja Computer Village Hub' },
      { label: 'Victoria Island Transit Point', value: 'Victoria Island Transit Point' },
      { label: 'Lekki Phase 1 Depot', value: 'Lekki Phase 1 Depot' },
      { label: 'Surulere National Stadium Hub', value: 'Surulere National Stadium Hub' },
      { label: 'Oshodi Interchange Superhub', value: 'Oshodi Interchange Superhub' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'dateRange',
    placeholder: 'Select duration',
  },
  {
    key: 'sortOrder',
    label: 'Sort By Timestamp',
    type: 'sortOrder',
    options: [
      { label: 'Newest First', value: 'desc' },
      { label: 'Oldest First', value: 'asc' },
    ],
  },
]

export function WorkbenchPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<string | null>('table')

  // Table state
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<string | null>('10')
  const [isTableLoading, setIsTableLoading] = useState(false)

  // Filter modal state
  const [filterOpened, setFilterOpened] = useState(false)
  const [filterValues, setFilterValues] = useState<TableFilterValues>({
    status: [],
    station: null,
    dateRange: { start_date: '', end_date: '' },
    sortOrder: 'desc',
  })

  // Standalone date picker state
  const [standaloneDate, setStandaloneDate] = useState<DateRangeOutput>({
    start_date: '',
    end_date: '',
  })

  // Details drawer state
  const [drawerOpened, setDrawerOpened] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<SwapRecord | null>(null)

  // Modals state
  const [successModalOpened, setSuccessModalOpened] = useState(false)
  const [warningModalOpened, setWarningModalOpened] = useState(false)

  // Skeletons preview state
  const [previewLoadingOverlay, setPreviewLoadingOverlay] = useState(false)

  // Filtered table data
  const filteredData = useMemo(() => {
    return INITIAL_DATA.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          item.id.toLowerCase().includes(q) ||
          item.station.toLowerCase().includes(q) ||
          item.driver.toLowerCase().includes(q) ||
          item.batteryIn.toLowerCase().includes(q)
        if (!matches) return false
      }

      // Status filter
      const statusArr = filterValues.status as string[]
      if (statusArr && statusArr.length > 0) {
        if (!statusArr.includes(item.status)) return false
      }

      // Station filter
      if (filterValues.station && filterValues.station !== item.station) {
        return false
      }

      return true
    })
  }, [searchQuery, filterValues])

  const handleInspect = (record: SwapRecord) => {
    setSelectedRecord(record)
    setDrawerOpened(true)
  }

  const drawerRows: DetailsDrawerRow[] = selectedRecord
    ? [
        { label: 'Swap Reference', value: selectedRecord.id },
        { label: 'Hub Station', value: selectedRecord.station },
        { label: 'Driver Account', value: selectedRecord.driver },
        { label: 'Returned Battery', value: selectedRecord.batteryIn },
        { label: 'Issued Battery', value: selectedRecord.batteryOut },
        {
          label: 'Health & Charge State',
          value: (
            <Badge color="teal" variant="light" size="sm">
              {selectedRecord.soc}% SOC (Good Health)
            </Badge>
          ),
        },
        {
          label: 'Status',
          value: (
            <TableStatusBadge
              tone={
                selectedRecord.status === 'COMPLETED'
                  ? 'success'
                  : selectedRecord.status === 'FLAGGED'
                  ? 'danger'
                  : selectedRecord.status === 'IN_PROGRESS'
                  ? 'info'
                  : 'warning'
              }
              label={selectedRecord.status}
            />
          ),
        },
        { label: 'Payment Deducted', value: selectedRecord.amount },
        { label: 'Transaction Timestamp', value: selectedRecord.date },
      ]
    : []

  return (
    <Box className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navbar */}
      <Box className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md px-6 py-3.5">
        <Container size="xl">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0D7C8F] to-[#2FBECF] text-white shadow-sm">
                <ZapIcon size={20} />
              </div>
              <div>
                <Group gap="xs">
                  <Text fw={700} fz="md" c="#0F172A">
                    KURA Mobility
                  </Text>
                  <Badge size="xs" color="teal" variant="light">
                    Client Workbench
                  </Badge>
                </Group>
                <Text fz="xs" c="dimmed">
                  Shared Components Architecture (Clean Slate)
                </Text>
              </div>
            </Group>

            <Group gap="sm">
              <Button
                component="a"
                href="http://localhost:8001/api/docs/"
                target="_blank"
                variant="light"
                color="brand"
                size="xs"
                leftSection={<ViewIcon size={14} />}
              >
                Scalar API Reference
              </Button>
              <Button
                component="a"
                href="http://localhost:8001/api/schema/"
                target="_blank"
                variant="default"
                size="xs"
                leftSection={<Download01Icon size={14} />}
              >
                Download Schema
              </Button>
              <Button
                component="a"
                href="http://localhost:5176"
                variant="filled"
                color="dark"
                size="xs"
              >
                Switch to Admin App →
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Breadcrumb & Intro */}
          <div>
            <PageBreadcrumb
              items={[
                { label: 'KURA Platform', href: '/' },
                { label: 'Shared Components Catalog' },
              ]}
            />
            <Title order={2} fw={700} c="#0F172A" mt="xs">
              Components & UI Workbench
            </Title>
            <Text fz="sm" c="#64748B" mt={2}>
              Production-ready shared components: Mantine Table, Filter Panels, HugeIcons, Date Picker, Loaders, and Modals.
            </Text>
          </div>

          {/* Quick Stats / Overview Banner */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    Icon System
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    Hugeicons React
                  </Text>
                </div>
                <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                  <ZapIcon size={22} />
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    Interactive Documentation
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    Scalar UI & Schema
                  </Text>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
                  <TableIcon size={22} />
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    Shared Foundation
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    NHEF-Nexus Architecture
                  </Text>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-700">
                  <Layers01Icon size={22} />
                </div>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Component Tabs */}
          <Paper radius="lg" withBorder bg="white" p="md">
            <Tabs value={activeTab} onChange={setActiveTab} color="brand">
              <Tabs.List>
                <Tabs.Tab value="table" leftSection={<TableIcon size={16} />}>
                  Dynamic Table & Toolbar ({filteredData.length})
                </Tabs.Tab>
                <Tabs.Tab value="date-picker" leftSection={<Calendar03Icon size={16} />}>
                  Date Range Picker
                </Tabs.Tab>
                <Tabs.Tab value="modals" leftSection={<Alert02Icon size={16} />}>
                  Drawers & Modals
                </Tabs.Tab>
                <Tabs.Tab value="loaders" leftSection={<Loading03Icon size={16} />}>
                  Loading & Skeletons
                </Tabs.Tab>
              </Tabs.List>

              {/* TAB 1: Dynamic Table & Toolbar */}
              <Tabs.Panel value="table" pt="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text fz="sm" c="dimmed">
                      Demonstrating <Code>DynamicTableSection</Code>, <Code>TableToolbar</Code>, <Code>TableStatusBadge</Code>, and <Code>TableFilterModal</Code>.
                    </Text>
                    <Group gap="xs">
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => setIsTableLoading((prev) => !prev)}
                      >
                        Toggle Table Loading: {isTableLoading ? 'ON' : 'OFF'}
                      </Button>
                    </Group>
                  </Group>

                  <DynamicTableSection<SwapRecord>
                    headers={TABLE_HEADERS}
                    data={filteredData}
                    loading={isTableLoading}
                    toolbar={{
                      title: 'Live Battery Swaps & Telematics',
                      searchQuery,
                      onSearchChange: setSearchQuery,
                      searchPlaceholder: 'Search by Swap ID, station, driver...',
                      showFilter: true,
                      onFilter: () => setFilterOpened(true),
                      showExport: true,
                      onExportFormat: (fmt) => {
                        alert(`Exporting ${filteredData.length} records as ${fmt.toUpperCase()}`)
                      },
                    }}
                    pagination={{
                      page,
                      totalPages: Math.max(1, Math.ceil(filteredData.length / 5)),
                      onPageChange: setPage,
                      variant: 'controls',
                      pageSize: pageSize || '10',
                      onPageSizeChange: setPageSize,
                      onNext: () => setPage((p) => Math.min(p + 1, 2)),
                      onPrevious: () => setPage((p) => Math.max(p - 1, 1)),
                    }}
                    onRowClick={handleInspect}
                    renderItems={(item) => [
                      <Text key="id" fw={600} fz="sm" c="brand.9">
                        {item.id}
                      </Text>,
                      <Text key="station" fz="sm" c="#334155">
                        {item.station}
                      </Text>,
                      <Text key="driver" fz="sm" fw={500} c="#0F172A">
                        {item.driver}
                      </Text>,
                      <div key="battery">
                        <Text fz="xs" c="red.6">
                          ▼ {item.batteryIn}
                        </Text>
                        <Text fz="xs" c="teal.7" fw={600}>
                          ▲ {item.batteryOut}
                        </Text>
                      </div>,
                      <TableStatusBadge
                        key="status"
                        tone={
                          item.status === 'COMPLETED'
                            ? 'success'
                            : item.status === 'FLAGGED'
                            ? 'danger'
                            : item.status === 'IN_PROGRESS'
                            ? 'info'
                            : 'warning'
                        }
                        label={item.status}
                      />,
                      <Text key="date" fz="xs" c="dimmed">
                        {item.date}
                      </Text>,
                      <Text key="amount" fz="sm" fw={600} c="#0F172A">
                        {item.amount}
                      </Text>,
                      <Button
                        key="action"
                        variant="subtle"
                        size="xs"
                        color="brand"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleInspect(item)
                        }}
                      >
                        Inspect
                      </Button>,
                    ]}
                  />
                </Stack>
              </Tabs.Panel>

              {/* TAB 2: Date Range Picker */}
              <Tabs.Panel value="date-picker" pt="lg">
                <Stack gap="md" maw={640}>
                  <Text fz="sm" c="dimmed">
                    Demonstrating <Code>DateRangePicker</Code> with calendar popover and presets (Today, Last 7 days, Last 30 days, etc.) using Hugeicons.
                  </Text>

                  <Paper p="lg" withBorder radius="md">
                    <DateRangePicker
                      label="Select Operations Window"
                      date={standaloneDate}
                      onChange={setStandaloneDate}
                      placeholder="Choose custom date range"
                      fullWidth
                    />

                    <Box mt="md" p="sm" bg="gray.0" className="rounded-md">
                      <Text fz="xs" fw={600} c="dimmed">
                        Current Selected Value:
                      </Text>
                      <Code block mt={4}>
                        {JSON.stringify(standaloneDate, null, 2)}
                      </Code>
                    </Box>
                  </Paper>
                </Stack>
              </Tabs.Panel>

              {/* TAB 3: Drawers & Modals */}
              <Tabs.Panel value="modals" pt="lg">
                <Stack gap="md">
                  <Text fz="sm" c="dimmed">
                    Interactive triggers for <Code>DetailsDrawer</Code>, <Code>IllustratedStatusModal</Code>, and <Code>IllustratedModalLayout</Code>.
                  </Text>

                  <Group gap="md">
                    <Button
                      variant="default"
                      leftSection={<ViewIcon size={16} />}
                      onClick={() => {
                        setSelectedRecord(INITIAL_DATA[0])
                        setDrawerOpened(true)
                      }}
                    >
                      Open Details Drawer
                    </Button>

                    <Button
                      color="brand"
                      leftSection={<Tick01Icon size={16} />}
                      onClick={() => setSuccessModalOpened(true)}
                    >
                      Open Success Modal
                    </Button>

                    <Button
                      color="red"
                      variant="light"
                      leftSection={<Alert02Icon size={16} />}
                      onClick={() => setWarningModalOpened(true)}
                    >
                      Open Alert / Flag Modal
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              {/* TAB 4: Loaders & Skeletons */}
              <Tabs.Panel value="loaders" pt="lg">
                <Stack gap="md">
                  <Text fz="sm" c="dimmed">
                    Loading skeletons imported directly from <Code>nhef_merge</Code>:
                  </Text>

                  <Group gap="sm">
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => {
                        setPreviewLoadingOverlay(true)
                        setTimeout(() => setPreviewLoadingOverlay(false), 2000)
                      }}
                    >
                      Preview Fullscreen Route Loader (2s)
                    </Button>
                  </Group>

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    1. Card Grid Skeleton
                  </Title>
                  <CardGridSkeleton count={3} />

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    2. Detail Page Skeleton
                  </Title>
                  <DetailPageSkeleton />

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    3. Form Page Skeleton
                  </Title>
                  <FormPageSkeleton />
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Stack>
      </Container>

      {/* Table Filter Modal */}
      <TableFilterModal
        opened={filterOpened}
        onClose={() => setFilterOpened(false)}
        fields={FILTER_FIELDS}
        value={filterValues}
        onApply={(newVals) => {
          setFilterValues(newVals)
          setFilterOpened(false)
        }}
        onReset={() => {
          setFilterValues({
            status: [],
            station: null,
            dateRange: { start_date: '', end_date: '' },
            sortOrder: 'desc',
          })
          setFilterOpened(false)
        }}
      />

      {/* Details Slide-Over Drawer */}
      <DetailsDrawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        title={selectedRecord ? `Swap ${selectedRecord.id}` : 'Record Details'}
        rows={drawerRows}
        footer={
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setDrawerOpened(false)}>
              Close
            </Button>
            <Button
              color="brand"
              onClick={() => {
                alert(`Exporting official audit receipt for ${selectedRecord?.id}`)
              }}
            >
              Export Receipt
            </Button>
          </Group>
        }
      />

      {/* Success Illustrated Modal */}
      <IllustratedStatusModal
        opened={successModalOpened}
        onClose={() => setSuccessModalOpened(false)}
        illustration={
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <Tick01Icon size={48} />
          </div>
        }
        title="Battery Swap Approved & Verified"
        description="The battery swap has been successfully recorded on the immutable ledger. Telemetry synchronization is complete."
        actionLabel="Done & Dismiss"
        onAction={() => setSuccessModalOpened(false)}
      />

      {/* Warning Illustrated Modal */}
      <IllustratedStatusModal
        opened={warningModalOpened}
        onClose={() => setWarningModalOpened(false)}
        illustrationBg="#FEF2F2"
        illustration={
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Alert02Icon size={48} />
          </div>
        }
        title="Battery Mismatch Flagged"
        description="The serial number scanned from the returned battery does not match the active vehicle reservation. An audit exception has been created."
        actionLabel="Review Flagged Issue"
        onAction={() => setWarningModalOpened(false)}
      />

      {/* Fullscreen Loading preview */}
      {previewLoadingOverlay && <RouteLoadingFallback />}
    </Box>
  )
}
