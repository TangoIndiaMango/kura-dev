import { useFetchData } from '@shared/hooks/api'

export type UssdMenuItem = {
  label?: string
  flow?: string
}

export type UssdEffective = {
  enabled?: boolean
  shortcode?: string
  session_timeout_seconds?: number
  primary_language?: string
  menu?: Record<string, UssdMenuItem>
}

export type SmsTemplateRow = {
  code: string
  name: string
  body: string
  status: string
}

export type SmsTemplatesEffective = {
  enabled?: boolean
  templates?: SmsTemplateRow[]
}

type NamespaceSnapshot<T> = {
  namespace: string
  effective: T
  active_version_id: string | null
}

export function useUssdConfig(enabled = true) {
  return useFetchData<NamespaceSnapshot<UssdEffective>>(
    '/config/ussd/',
    undefined,
    { enabled, staleTime: 30_000 },
  )
}

export function useSmsTemplatesConfig(enabled = true) {
  return useFetchData<NamespaceSnapshot<SmsTemplatesEffective>>(
    '/config/sms_templates/',
    undefined,
    { enabled, staleTime: 30_000 },
  )
}
