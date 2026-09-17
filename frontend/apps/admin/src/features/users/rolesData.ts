export type CrudAction = 'create' | 'read' | 'update' | 'delete'

export interface RoleItem {
  id: string
  code: string
  name: string
  description: string
  is_system: boolean
  is_active: boolean
  permissionCount: number
  usersAssigned: number
  updatedAt: string
  status: 'ACTIVE' | 'INACTIVE'
}

/** Modules shown in the Role permissions matrix (original admin grid). */
export const MATRIX_MODULES = [
  'Hubs',
  'Batteries',
  'Operators',
  'Vehicles',
  'Agents',
  'Swaps',
  'Payments',
  'Alerts',
  'Cases',
  'Pricing',
  'Discounts',
  'Users',
  'Approvals',
  'Audit',
] as const

export type MatrixModule = (typeof MATRIX_MODULES)[number]

export const CRUD_ACTIONS: CrudAction[] = ['create', 'read', 'update', 'delete']

export function matrixPermCode(module: string, action: CrudAction): string {
  return `${module.toLowerCase()}:${action}`
}

/** Map matrix row → backend capability resource prefixes. */
const MODULE_RESOURCES: Record<string, string[]> = {
  hubs: ['hubs'],
  batteries: ['batteries'],
  operators: ['accounts'],
  vehicles: ['vehicles'],
  agents: ['shifts', 'agents'],
  swaps: ['swaps'],
  payments: ['finance', 'wallets'],
  alerts: ['alerts'],
  cases: ['cases'],
  pricing: ['tariffs', 'price'],
  discounts: ['discounts'],
  users: ['users', 'roles'],
  approvals: ['price', 'credit'],
  audit: ['audit', 'identity'],
}

/** Rider roles — never offered in staff invite / change-role pickers. */
export const OPERATOR_ROLE_CODES = new Set(['DRIVER', 'FLEET_OWNER'])

export function isAssignableStaffRole(code: string, isActive = true): boolean {
  return isActive && !OPERATOR_ROLE_CODES.has(code)
}

export function roleHasWriteAccess(codes: string[]): boolean {
  return codes.some(
    (c) =>
      c.endsWith(':manage') ||
      c.endsWith(':complete') ||
      c.endsWith(':override') ||
      c.endsWith(':approve') ||
      c.endsWith(':reveal') ||
      c.endsWith(':create') ||
      c.endsWith(':update') ||
      c.endsWith(':delete'),
  )
}

/** Whether a matrix cell is granted given live `resource:action` codes. */
export function matrixCellGranted(
  codes: string[],
  module: string,
  action: CrudAction,
): boolean {
  const set = new Set(codes)
  const key = module.toLowerCase()
  if (set.has(matrixPermCode(module, action))) return true

  const resources = MODULE_RESOURCES[key] ?? [key]
  if (action === 'read') {
    return resources.some(
      (r) =>
        set.has(`${r}:read`) ||
        set.has(`${r}:manage`) ||
        set.has(`${r}:complete`) ||
        set.has(`${r}:write_own`),
    )
  }
  return resources.some(
    (r) =>
      set.has(`${r}:manage`) ||
      set.has(`${r}:complete`) ||
      set.has(`${r}:override`) ||
      set.has(`${r}:approve`) ||
      set.has(`${r}:reveal`) ||
      set.has(`${r}:${action}`),
  )
}
