import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton, Title, Text } from '@mantine/core'
import {
  AdminFormSuccessModal,
  SidebarFormLayout,
} from '@shared/components'
import { uploadMedia } from '@lib/api/media'
import { useHubs } from '@features/hubs'
import { useOperators } from '@features/operators'
import { useVehicles } from '@features/vehicles'
import { useStaffUsers } from '../users/hooks/use-users'
import { useCapabilities } from '../auth/useCapabilities'
import { EngineFormCreateFooter } from './EngineFormCreateFooter'
import { EngineFormIntakeFields } from './EngineFormIntakeFields'
import { EngineFormJobFields } from './EngineFormJobFields'
import { ENGINE_FORM_TIPS } from './engineFormTips'
import {
  useCreateRetrofit,
  useEngineIntake,
  useRetrofit,
} from './hooks/use-engines'

type Props = {
  resumeRetrofitId?: string
}

export function EngineFormCreate({ resumeRetrofitId }: Props) {
  const navigate = useNavigate()
  const { can } = useCapabilities()
  const resuming = Boolean(resumeRetrofitId)
  const { retrofit, isPending: jobLoading } = useRetrofit(resumeRetrofitId, {
    enabled: resuming,
  })

  const [step, setStep] = useState(resuming ? 1 : 0)
  const [savedEngineId, setSavedEngineId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [eboarderSerial, setEboarderSerial] = useState('')
  const [tag, setTag] = useState('')
  const [make, setMake] = useState('Yamaha')
  const [model, setModel] = useState('')
  const [hp, setHp] = useState('15')
  const [condition, setCondition] = useState('FAIR')
  const [hubId, setHubId] = useState('')
  const [witnessId, setWitnessId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoFile2, setPhotoFile2] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retrofitId, setRetrofitId] = useState(resumeRetrofitId ?? '')
  const [uploading, setUploading] = useState(false)

  const createRetrofit = useCreateRetrofit()
  const intake = useEngineIntake()
  const { operators } = useOperators({ page: 1, page_size: 100 })
  const { vehicles } = useVehicles(
    { page: 1, page_size: 100 },
    { enabled: can('vehicles:read') },
  )
  const { hubs } = useHubs(
    { page: 1, page_size: 50 },
    { enabled: can('hubs:read') },
  )
  const { raw: staff } = useStaffUsers({
    page: 1,
    page_size: 50,
    enabled: true,
  })

  useEffect(() => {
    if (!retrofit) return
    setRetrofitId(retrofit.id)
    setAccountId(retrofit.account_id)
    setVehicleId(retrofit.vehicle_id)
    setEboarderSerial(retrofit.eboarder_serial || '')
    if (retrofit.petrol_engine_id) {
      navigate(`/engines/${retrofit.petrol_engine_id}`, { replace: true })
      return
    }
    setStep(1)
  }, [retrofit?.id])

  const vehicleOptions = useMemo(
    () =>
      vehicles
        .filter((v) => !accountId || v.account_id === accountId)
        .map((v) => ({
          value: v.id,
          label: `${v.registration_plate} · ${v.owner_name}`,
        })),
    [vehicles, accountId],
  )

  const leave = () => navigate('/engines')
  const busy = createRetrofit.isPending || intake.isPending || uploading
  const stepLabel =
    step === 0 ? 'Log job' : step === 1 ? 'Seal intake' : 'Done'

  const createJob = async () => {
    if (!accountId || !vehicleId) {
      setError('Account and vehicle are required.')
      return null
    }
    const row = await createRetrofit.mutateAsync({
      account_id: accountId,
      vehicle_id: vehicleId,
      eboarder_serial: eboarderSerial || undefined,
    })
    setRetrofitId(row.id)
    return row
  }

  const submitJobContinue = async () => {
    setError(null)
    try {
      await createJob()
      setStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create retrofit.')
    }
  }

  const submitJobAndClose = async () => {
    setError(null)
    try {
      await createJob()
      leave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create retrofit.')
    }
  }

  const submitIntake = async () => {
    setError(null)
    if (!retrofitId || !tag.trim() || !witnessId || !signatureFile || !photoFile) {
      setError('Tag, witness, intake photo, and signature are required.')
      return
    }
    setUploading(true)
    try {
      const uploads = await Promise.all([
        uploadMedia(photoFile, 'engines'),
        photoFile2 ? uploadMedia(photoFile2, 'engines') : Promise.resolve(null),
        uploadMedia(signatureFile, 'engines'),
      ])
      const photo_asset_ids = uploads
        .slice(0, 2)
        .filter(Boolean)
        .map((u) => u!.id)
      const signature_asset_id = uploads[2]!.id
      const row = await intake.mutateAsync({
        retrofit_id: retrofitId,
        tag: tag.trim().toUpperCase(),
        make,
        model,
        hp,
        condition_grade: condition,
        witness_user_id: witnessId,
        photo_asset_ids,
        signature_asset_id,
        storage_hub_id: hubId || null,
        raw: notes ? { intake_notes: notes } : undefined,
      })
      setSavedEngineId(row.petrol_engine_id)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Intake failed.')
    } finally {
      setUploading(false)
    }
  }

  if (resuming && jobLoading) {
    return (
      <SidebarFormLayout
        sidebarTitle="Continue retrofit"
        sidebarSubtitle="Retrofit & Engines"
        sidebarTips={ENGINE_FORM_TIPS}
        onClose={leave}
        headerActionLabel="Close ×"
      >
        <Skeleton height={200} radius="md" />
      </SidebarFormLayout>
    )
  }

  const footer = (
    <EngineFormCreateFooter
      step={step}
      busy={busy}
      resuming={resuming}
      onLeave={leave}
      onBackToJob={() => setStep(0)}
      onContinueIntake={() => {
        submitJobContinue().catch(() => undefined)
      }}
      onSaveAndClose={() => {
        submitJobAndClose().catch(() => undefined)
      }}
      onSealIntake={() => {
        submitIntake().catch(() => undefined)
      }}
    />
  )

  return (
    <>
      <SidebarFormLayout
        sidebarTitle={resuming ? 'Continue retrofit' : 'New retrofit'}
        sidebarSubtitle="Retrofit & Engines"
        sidebarTips={ENGINE_FORM_TIPS}
        steps={[{ label: 'Job' }, { label: 'Intake' }, { label: 'Done' }]}
        activeStep={step}
        onClose={leave}
        headerActionLabel="Close ×"
        footer={footer}
      >
        {error ? (
          <Text size="sm" c="red" mb="sm">
            {error}
          </Text>
        ) : null}
        <div>
          <Title order={2} className="text-[var(--tx)]">
            {stepLabel}
          </Title>
          <Text size="sm" c="dimmed" mt={6} mb="md">
            {step === 0
              ? 'Save the job when the request arrives. Intake can wait.'
              : step === 1
                ? 'Tag the petrol unit when staff are on site — photos, signature, hub, witness.'
                : 'Intake sealed. Install and activation happen on the engine detail when the e-boarder team is ready.'}
          </Text>
        </div>
        {step === 0 ? (
          <EngineFormJobFields
            accountId={accountId}
            vehicleId={vehicleId}
            eboarderSerial={eboarderSerial}
            accountOptions={operators.map((o) => ({
              value: o.id,
              label: `${o.name} · ${o.kuraId}`,
            }))}
            vehicleOptions={vehicleOptions}
            onAccountId={setAccountId}
            onVehicleId={setVehicleId}
            onEboarderSerial={setEboarderSerial}
          />
        ) : null}
        {step === 1 ? (
          <EngineFormIntakeFields
            tag={tag}
            make={make}
            model={model}
            hp={hp}
            condition={condition}
            hubId={hubId}
            witnessId={witnessId}
            photoFile={photoFile}
            photoFile2={photoFile2}
            signatureFile={signatureFile}
            notes={notes}
            hubs={hubs.map((h) => ({
              value: h.id,
              label: `${h.code} · ${h.name}`,
            }))}
            staff={staff.map((u) => ({
              value: u.id,
              label: `${u.first_name} ${u.last_name} · ${u.role}`,
            }))}
            onTag={setTag}
            onMake={setMake}
            onModel={setModel}
            onHp={setHp}
            onCondition={setCondition}
            onHubId={setHubId}
            onWitnessId={setWitnessId}
            onPhotoFile={setPhotoFile}
            onPhotoFile2={setPhotoFile2}
            onSignatureFile={setSignatureFile}
            onNotes={setNotes}
          />
        ) : null}
        {step === 2 ? (
          <Text size="sm">
            Intake sealed. Open the engine detail when install staff are available.
          </Text>
        ) : null}
      </SidebarFormLayout>
      <AdminFormSuccessModal
        opened={step === 2 && Boolean(savedEngineId)}
        onClose={leave}
        title="Engine intake sealed"
        description="Petrol unit is stored. Finish install and activation on the detail page when ready."
        actionLabel="Open engine"
        onAction={() => navigate(`/engines/${savedEngineId}`)}
      />
    </>
  )
}
