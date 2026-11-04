import { useNavigate } from 'react-router-dom'
import { Alert, Button, Skeleton } from '@mantine/core'
import { File01Icon, FileExportIcon } from 'hugeicons-react'
import { useDatasets } from './api'

/** The modules this user can export; each opens the report builder. */
export function ReportsExploreTab() {
  const navigate = useNavigate()
  const datasets = useDatasets()

  if (datasets.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={170} radius="md" />
        ))}
      </div>
    )
  }
  if (datasets.isError) {
    return <Alert color="red">The list of reports could not be loaded.</Alert>
  }
  if (!datasets.data?.length) {
    return <Alert color="yellow">You do not have access to any module exports.</Alert>
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {datasets.data.map((d) => (
        <section
          key={d.code}
          className="flex flex-col items-start gap-3 rounded-[14px] border border-[var(--bd)] bg-[var(--sf)] p-5 shadow-[var(--sh)]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--prs)] text-[var(--pr)]">
            <File01Icon size={20} />
          </span>
          <div>
            <h3 className="text-[17px] font-bold text-[var(--tx)]">{d.label}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--mu)]">{d.description}</p>
          </div>
          <Button
            mt="auto"
            color="brand"
            leftSection={<FileExportIcon size={16} />}
            onClick={() => navigate(`/reports/${d.code}/build`)}
          >
            Generate report
          </Button>
        </section>
      ))}
    </div>
  )
}
