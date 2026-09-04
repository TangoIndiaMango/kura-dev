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
} from '@mantine/core'
import {
  ZapIcon,
  Calendar03Icon,
  Tick01Icon,
  Alert02Icon,
  Download01Icon,
  Layers01Icon,
  TableIcon,
  Loading03Icon,
  ViewIcon,
  Settings02Icon,
  CloudUploadIcon,
} from 'hugeicons-react'

import {
  DynamicTableSection,
  TableStatusBadge,
  DateRangePicker,
  TableFilterModal,
  DetailsDrawer,
  IllustratedStatusModal,
  RouteLoadingFallback,
  DetailPageLoadingSkeleton,
  FormPageLoadingSkeleton,
  PageLoadingSkeleton,
  GoBackLink,
  FormFooterActions,
  MediaDropzone,
  type TableHeader,
  type TableFilterFieldConfig,
  type TableFilterValues,
  type DetailsDrawerRow,
  type DateRangeOutput,
} from '../shared/components'

interface BatteryFleetRecord {
  id: string
  serial: string
  model: string
  currentHub: string
  chargePct: number
  status: 'AVAILABLE' | 'CHARGING' | 'MAINTENANCE' | 'ISSUED'
  cycles: number
  lastUpdated: string
}

const INITIAL_FLEET_DATA: BatteryFleetRecord[] = [
  {
    id: 'BAT-001',
    serial: 'KUR-BAT-1049',
    model: 'LiFePO4 72V 45Ah',
    currentHub: 'Yaba Central Mega Hub',
    chargePct: 98,
    status: 'AVAILABLE',
    cycles: 142,
    lastUpdated: '2 mins ago',
  },
  {
    id: 'BAT-002',
    serial: 'KUR-BAT-2088',
    model: 'LiFePO4 72V 45Ah',
    currentHub: 'Ikeja Computer Village Hub',
    chargePct: 45,
    status: 'CHARGING',
    cycles: 88,
    lastUpdated: '5 mins ago',
  },
  {
    id: 'BAT-003',
    serial: 'KUR-BAT-4402',
    model: 'NMC 60V 38Ah',
    currentHub: 'Victoria Island Transit Point',
    chargePct: 12,
    status: 'CHARGING',
    cycles: 210,
    lastUpdated: 'Just now',
  },
  {
    id: 'BAT-004',
    serial: 'KUR-BAT-3301',
    model: 'LiFePO4 72V 45Ah',
    currentHub: 'Surulere National Stadium Hub',
    chargePct: 5,
    status: 'MAINTENANCE',
    cycles: 540,
    lastUpdated: '12 mins ago',
  },
  {
    id: 'BAT-005',
    serial: 'KUR-BAT-5512',
    model: 'LiFePO4 72V 45Ah',
    currentHub: 'On-Vehicle (Rider Chinedu)',
    chargePct: 82,
    status: 'ISSUED',
    cycles: 74,
    lastUpdated: '1 hour ago',
  },
  {
    id: 'BAT-006',
    serial: 'KUR-BAT-6731',
    model: 'LiFePO4 72V 45Ah',
    currentHub: 'Oshodi Interchange Superhub',
    chargePct: 100,
    status: 'AVAILABLE',
    cycles: 31,
    lastUpdated: '4 mins ago',
  },
]

const FLEET_TABLE_HEADERS: TableHeader[] = [
  { key: 'serial', label: 'Battery Serial' },
  { key: 'model', label: 'Specification' },
  { key: 'hub', label: 'Current Location / Hub' },
  { key: 'charge', label: 'Charge (SOC)' },
  { key: 'status', label: 'Status' },
  { key: 'cycles', label: 'Life Cycles' },
  { key: 'updated', label: 'Last Sync' },
  { key: 'action', label: 'Action' },
]

const FLEET_FILTER_FIELDS: TableFilterFieldConfig[] = [
  {
    key: 'status',
    label: 'Battery Status',
    type: 'multiCheckbox',
    presentation: 'popover',
    placeholder: 'Filter status',
    options: [
      { label: 'Available (Ready)', value: 'AVAILABLE' },
      { label: 'Charging', value: 'CHARGING' },
      { label: 'Issued to Driver', value: 'ISSUED' },
      { label: 'Under Maintenance', value: 'MAINTENANCE' },
    ],
  },
  {
    key: 'hub',
    label: 'Hub Location',
    type: 'select',
    placeholder: 'All Hubs',
    options: [
      { label: 'Yaba Central Mega Hub', value: 'Yaba Central Mega Hub' },
      { label: 'Ikeja Computer Village Hub', value: 'Ikeja Computer Village Hub' },
      { label: 'Victoria Island Transit Point', value: 'Victoria Island Transit Point' },
      { label: 'Surulere National Stadium Hub', value: 'Surulere National Stadium Hub' },
      { label: 'Oshodi Interchange Superhub', value: 'Oshodi Interchange Superhub' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Commission Date Range',
    type: 'dateRange',
    placeholder: 'Select duration',
  },
  {
    key: 'sortOrder',
    label: 'Sort By SOC',
    type: 'sortOrder',
    options: [
      { label: 'Highest SOC First', value: 'desc' },
      { label: 'Lowest SOC First', value: 'asc' },
    ],
  },
]

export function AdminWorkbenchPage() {
  const [activeTab, setActiveTab] = useState<string | null>('table')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<string | null>('10')
  const [isTableLoading, setIsTableLoading] = useState(false)

  const [filterOpened, setFilterOpened] = useState(false)
  const [filterValues, setFilterValues] = useState<TableFilterValues>({
    status: [],
    hub: null,
    dateRange: { start_date: '', end_date: '' },
    sortOrder: 'desc',
  })

  const [standaloneDate, setStandaloneDate] = useState<DateRangeOutput>({
    start_date: '',
    end_date: '',
  })

  const [drawerOpened, setDrawerOpened] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BatteryFleetRecord | null>(null)

  const [actionModalOpened, setActionModalOpened] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)

  const filteredData = useMemo(() => {
    return INITIAL_FLEET_DATA.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          item.serial.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          item.currentHub.toLowerCase().includes(q)
        if (!matches) return false
      }

      const statusArr = filterValues.status as string[]
      if (statusArr && statusArr.length > 0) {
        if (!statusArr.includes(item.status)) return false
      }

      if (filterValues.hub && filterValues.hub !== item.currentHub) {
        return false
      }

      return true
    })
  }, [searchQuery, filterValues])

  const handleInspect = (record: BatteryFleetRecord) => {
    setSelectedRecord(record)
    setDrawerOpened(true)
  }

  const drawerRows: DetailsDrawerRow[] = selectedRecord
    ? [
        { label: 'Battery Serial Number', value: selectedRecord.serial },
        { label: 'Battery Chemistry / Spec', value: selectedRecord.model },
        { label: 'Assigned Hub / Station', value: selectedRecord.currentHub },
        {
          label: 'Current Charge (SOC)',
          value: (
            <Badge
              color={selectedRecord.chargePct > 80 ? 'teal' : selectedRecord.chargePct > 30 ? 'blue' : 'red'}
              variant="light"
            >
              {selectedRecord.chargePct}% Charge
            </Badge>
          ),
        },
        {
          label: 'Operational Status',
          value: (
            <TableStatusBadge
              tone={
                selectedRecord.status === 'AVAILABLE'
                  ? 'success'
                  : selectedRecord.status === 'MAINTENANCE'
                  ? 'danger'
                  : selectedRecord.status === 'CHARGING'
                  ? 'info'
                  : 'pending'
              }
              label={selectedRecord.status}
            />
          ),
        },
        { label: 'Charge Cycles Completed', value: `${selectedRecord.cycles} cycles` },
        { label: 'BMS Heartbeat', value: selectedRecord.lastUpdated },
      ]
    : []

  return (
    <Box className="min-h-screen bg-[#F8FAFC]">
      {/* Top Navbar */}
      <Box className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-md px-6 py-3.5">
        <Container size="xl">
          <Group justify="space-between" align="center">
            <Group gap="md">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white shadow-sm">
                <ZapIcon size={20} />
              </div>
              <div>
                <Group gap="xs">
                  <Text fw={700} fz="md" c="#0F172A">
                    KURA Operations Admin
                  </Text>
                  <Badge size="xs" color="indigo" variant="light">
                    Admin Workbench
                  </Badge>
                </Group>
                <Text fz="xs" c="dimmed">
                  Mantine UI v8 + Tailwind v4 Shared Components
                </Text>
              </div>
            </Group>

            <Group gap="sm">
              <Button
                component="a"
                href="http://localhost:8001/api/docs/"
                target="_blank"
                variant="light"
                color="indigo"
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
                href="http://localhost:5175"
                variant="default"
                size="xs"
              >
                ← Switch to Client App
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Main Content */}
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <GoBackLink to="/" label="Platform Root" />
            <Title order={2} fw={700} c="#0F172A" mt="xs">
              Operations Component Workbench
            </Title>
            <Text fz="sm" c="#64748B" mt={2}>
              Clean-slate shared components showcase with Hugeicons React, Dynamic Tables, Filter Modals, and Media Dropzones.
            </Text>
          </div>

          {/* Metrics */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    Monitored Batteries
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    {INITIAL_FLEET_DATA.length} Assets Registered
                  </Text>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-700">
                  <ZapIcon size={22} />
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    Icon Architecture
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    hugeicons-react 0.4.0
                  </Text>
                </div>
                <div className="rounded-lg bg-teal-50 p-2.5 text-teal-700">
                  <Layers01Icon size={22} />
                </div>
              </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder bg="white">
              <Group justify="space-between">
                <div>
                  <Text fz="xs" fw={600} c="dimmed" tt="uppercase">
                    API Documentation
                  </Text>
                  <Text fw={700} fz="lg" c="#0F172A" mt={4}>
                    Scalar UI Active
                  </Text>
                </div>
                <div className="rounded-lg bg-purple-50 p-2.5 text-purple-700">
                  <TableIcon size={22} />
                </div>
              </Group>
            </Paper>
          </SimpleGrid>

          {/* Tabs */}
          <Paper radius="lg" withBorder bg="white" p="md">
            <Tabs value={activeTab} onChange={setActiveTab} color="indigo">
              <Tabs.List>
                <Tabs.Tab value="table" leftSection={<TableIcon size={16} />}>
                  Fleet Telematics Table ({filteredData.length})
                </Tabs.Tab>
                <Tabs.Tab value="date-range" leftSection={<Calendar03Icon size={16} />}>
                  Date Range Picker
                </Tabs.Tab>
                <Tabs.Tab value="media" leftSection={<CloudUploadIcon size={16} />}>
                  Media Dropzone
                </Tabs.Tab>
                <Tabs.Tab value="loaders" leftSection={<Loading03Icon size={16} />}>
                  Admin Skeletons
                </Tabs.Tab>
              </Tabs.List>

              {/* TAB 1: Table */}
              <Tabs.Panel value="table" pt="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Text fz="sm" c="dimmed">
                      Testing <Code>DynamicTableSection</Code>, <Code>TableToolbar</Code>, and <Code>TableFilterModal</Code> in Admin.
                    </Text>
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => setIsTableLoading((prev) => !prev)}
                    >
                      Toggle Table Loading: {isTableLoading ? 'ON' : 'OFF'}
                    </Button>
                  </Group>

                  <DynamicTableSection<BatteryFleetRecord>
                    headers={FLEET_TABLE_HEADERS}
                    data={filteredData}
                    loading={isTableLoading}
                    toolbar={{
                      title: 'Registered Battery Asset Registry',
                      searchQuery,
                      onSearchChange: setSearchQuery,
                      searchPlaceholder: 'Search by serial, model, hub...',
                      showFilter: true,
                      onFilter: () => setFilterOpened(true),
                      showExport: true,
                      onExportFormat: (fmt) => alert(`Exporting ${filteredData.length} records as ${fmt.toUpperCase()}`),
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
                      <Text key="serial" fw={600} fz="sm" c="indigo.7">
                        {item.serial}
                      </Text>,
                      <Text key="model" fz="sm" c="#334155">
                        {item.model}
                      </Text>,
                      <Text key="hub" fz="sm" c="#0F172A">
                        {item.currentHub}
                      </Text>,
                      <Badge
                        key="charge"
                        color={item.chargePct > 80 ? 'teal' : item.chargePct > 30 ? 'blue' : 'red'}
                        variant="light"
                        size="sm"
                      >
                        {item.chargePct}%
                      </Badge>,
                      <TableStatusBadge
                        key="status"
                        tone={
                          item.status === 'AVAILABLE'
                            ? 'success'
                            : item.status === 'MAINTENANCE'
                            ? 'danger'
                            : item.status === 'CHARGING'
                            ? 'info'
                            : 'pending'
                        }
                        label={item.status}
                      />,
                      <Text key="cycles" fz="sm" c="#334155">
                        {item.cycles}
                      </Text>,
                      <Text key="updated" fz="xs" c="dimmed">
                        {item.lastUpdated}
                      </Text>,
                      <Button
                        key="action"
                        variant="subtle"
                        size="xs"
                        color="indigo"
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

              {/* TAB 2: Date Picker */}
              <Tabs.Panel value="date-range" pt="lg">
                <Stack gap="md" maw={640}>
                  <Text fz="sm" c="dimmed">
                    Date Range Picker with preset filters and calendar integration:
                  </Text>
                  <Paper p="lg" withBorder radius="md">
                    <DateRangePicker
                      label="Select Operations Timeframe"
                      date={standaloneDate}
                      onChange={setStandaloneDate}
                      placeholder="Pick start and end date"
                      fullWidth
                    />

                    <Box mt="md" p="sm" bg="gray.0" className="rounded-md">
                      <Text fz="xs" fw={600} c="dimmed">
                        Selected Range:
                      </Text>
                      <Code block mt={4}>
                        {JSON.stringify(standaloneDate, null, 2)}
                      </Code>
                    </Box>
                  </Paper>
                </Stack>
              </Tabs.Panel>

              {/* TAB 3: Media Dropzone */}
              <Tabs.Panel value="media" pt="lg">
                <Stack gap="md" maw={640}>
                  <Text fz="sm" c="dimmed">
                    Demonstrating <Code>MediaDropzone</Code> using Hugeicons upload, edit, and delete icons:
                  </Text>
                  <Paper p="lg" withBorder radius="md">
                    <MediaDropzone
                      value={mediaFile}
                      onChange={setMediaFile}
                      label="Upload Maintenance / Battery Telematics Log"
                      description="Drag and drop diagnostic reports, inspection images, or telemetry logs here."
                    />
                  </Paper>
                </Stack>
              </Tabs.Panel>

              {/* TAB 4: Skeletons */}
              <Tabs.Panel value="loaders" pt="lg">
                <Stack gap="md">
                  <Group gap="sm">
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => {
                        setPreviewLoading(true)
                        setTimeout(() => setPreviewLoading(false), 2000)
                      }}
                    >
                      Preview Fullscreen Loader (2s)
                    </Button>
                  </Group>

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    1. Admin Detail Page Skeleton
                  </Title>
                  <DetailPageLoadingSkeleton />

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    2. Admin Form Page Skeleton
                  </Title>
                  <FormPageLoadingSkeleton />

                  <Title order={4} fz="sm" c="dimmed" mt="md">
                    3. Admin Overview Page Skeleton
                  </Title>
                  <PageLoadingSkeleton />
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Paper>
        </Stack>
      </Container>

      {/* Filter Modal */}
      <TableFilterModal
        opened={filterOpened}
        onClose={() => setFilterOpened(false)}
        fields={FLEET_FILTER_FIELDS}
        value={filterValues}
        onApply={(newVals) => {
          setFilterValues(newVals)
          setFilterOpened(false)
        }}
        onReset={() => {
          setFilterValues({
            status: [],
            hub: null,
            dateRange: { start_date: '', end_date: '' },
            sortOrder: 'desc',
          })
          setFilterOpened(false)
        }}
      />

      {/* Details Drawer */}
      <DetailsDrawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        title={selectedRecord ? `Asset ${selectedRecord.serial}` : 'Asset Details'}
        rows={drawerRows}
        footer={
          <FormFooterActions
            onBack={() => setDrawerOpened(false)}
            submitLabel="Perform Diagnostic"
            onSubmitClick={() => {
              setDrawerOpened(false)
              setActionModalOpened(true)
            }}
          />
        }
      />

      {/* Action Modal */}
      <IllustratedStatusModal
        opened={actionModalOpened}
        onClose={() => setActionModalOpened(false)}
        illustration={
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Tick01Icon size={48} />
          </div>
        }
        title="Diagnostic Sequence Initiated"
        description="A remote BMS telemetry poll was dispatched to the asset. Cell voltages and internal resistance will update momentarily."
        actionLabel="Acknowledge"
        onAction={() => setActionModalOpened(false)}
      />

      {previewLoading && <RouteLoadingFallback />}
    </Box>
  )
}
