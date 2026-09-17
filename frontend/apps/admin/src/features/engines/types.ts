export type EngineStatus =
  | 'STORED'
  | 'RELEASE_REQUESTED'
  | 'RELEASED'
  | 'DISPOSED'

export type RetrofitStatus =
  | 'INTAKE'
  | 'INSTALLED'
  | 'CHECKED'
  | 'ACTIVATED'
  | 'FAILED'

export type EngineConditionGrade = 'GOOD' | 'FAIR' | 'POOR' | 'UNKNOWN'

export type SafetyCheckId =
  | 'hull'
  | 'mount'
  | 'throttle'
  | 'kill'
  | 'cable'
  | 'float'

export type EngineSafetyChecks = Record<SafetyCheckId, boolean>

export type PageNumberPaginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
  current_page?: number
  total_pages?: number
  page_size?: number
}

/** List row — PetrolEngineListSerializer */
export type EngineListApi = {
  id: string
  tag: string
  make: string
  model: string
  hp: string
  condition_grade: EngineConditionGrade | string
  status: EngineStatus
  account_id: string
  owner_name: string
  owner_kura_id: string
  storage_hub_code: string | null
  storage_hub_name: string | null
  vehicle_id: string | null
  vehicle_reg: string
  retrofit_id: string | null
  retrofit_status: RetrofitStatus | null
  eboarder_serial?: string
  released_at: string | null
  created_at: string
}

export type EngineMediaItem = {
  id: string
  url: string | null
  label: string
  content_type?: string | null
}

export type EngineDetailApi = EngineListApi & {
  storage_hub_id: string | null
  intake_photos: string[]
  intake_media?: EngineMediaItem[]
  intake_signature: string
  intake_signature_media?: EngineMediaItem | null
  intake_agent_id: string | null
  intake_witness_id: string | null
  release_photos: string[]
  release_media?: EngineMediaItem[]
  release_signature?: string
  release_signature_media?: EngineMediaItem | null
  release_by_id: string | null
  raw: Record<string, unknown>
  updated_at: string
}

export type RetrofitListApi = {
  id: string
  status: RetrofitStatus
  eboarder_serial: string
  account_id: string
  owner_name: string
  vehicle_id: string
  vehicle_reg: string
  petrol_engine_id: string | null
  petrol_engine_tag: string | null
  petrol_engine_status: EngineStatus | string | null
  petrol_make: string | null
  petrol_model: string | null
  petrol_hp: string | null
  storage_hub_code: string | null
  storage_hub_name: string | null
  activated_at: string | null
  created_at: string
}

export type RetrofitDetailApi = RetrofitListApi & {
  checklist: Partial<EngineSafetyChecks>
  photos: string[]
  install_media?: EngineMediaItem[]
  agent_id: string | null
  raw: Record<string, unknown>
  updated_at: string
}

export type RetrofitCreatePayload = {
  account_id: string
  vehicle_id: string
  eboarder_serial?: string
  raw?: Record<string, unknown>
}

export type EngineIntakePayload = {
  tag: string
  make?: string
  model?: string
  hp?: string
  condition_grade?: EngineConditionGrade | string
  witness_user_id: string
  photo_asset_ids: string[]
  signature_asset_id: string
  storage_hub_id?: string | null
  raw?: Record<string, unknown>
}

export type RetrofitInstallPayload = {
  eboarder_id?: string
  eboarder_serial: string
  photo_asset_ids?: string[]
}

export type RetrofitChecklistPayload = {
  checklist: EngineSafetyChecks
  failure_reason?: string
}

export type EngineReleaseRequestPayload = {
  note?: string
}

export type EngineReleasePayload = {
  photo_asset_ids: string[]
  signature_asset_id: string
}

export type EBoarderStatus =
  | 'IN_STOCK'
  | 'ISSUED'
  | 'MAINTENANCE'
  | 'RETIRED'

export type EBoarderListApi = {
  id: string
  serial: string
  make: string
  model: string
  rated_watts: number
  rated_kw: string
  petrol_hp_equivalent: string
  nominal_voltage_v: number
  battery_type_id: string
  battery_type_name: string
  shaft_length: string
  status: EBoarderStatus
  current_hub_id: string | null
  current_hub_code: string | null
  current_hub_name: string | null
  vehicle_id: string | null
  vehicle_reg: string | null
  account_id: string | null
  owner_name: string | null
  issued_at: string | null
  created_at: string
}

export type EBoarderDetailApi = EBoarderListApi & {
  raw: Record<string, unknown>
  updated_at: string
}

export type EBoarderWritePayload = {
  serial: string
  make?: string
  model: string
  rated_watts: number
  petrol_hp_equivalent?: string
  nominal_voltage_v?: number
  battery_type: string
  shaft_length?: string
  status?: EBoarderStatus
  current_hub?: string | null
}

export type EBoarderStats = {
  totals: {
    all: number
    in_stock: number
    issued: number
    maintenance: number
    retired: number
  }
}
