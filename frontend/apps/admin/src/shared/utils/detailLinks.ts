import {
  MOCK_AGENTS,
  MOCK_BATTERIES,
  MOCK_HUBS,
  MOCK_OPERATORS,
  MOCK_VEHICLES,
  type AgentRecord,
  type BatteryRecord,
  type HubRecord,
  type OperatorRecord,
  type VehicleRecord,
} from '@shared/mock/adminMockData'

/** Resolve related entities for DetailsDrawer peeks (stay on parent detail). */

export function findOperatorByName(name: string): OperatorRecord | undefined {
  return MOCK_OPERATORS.find((o) => o.name === name)
}

export function findOperatorByKuraId(kuraId: string): OperatorRecord | undefined {
  return MOCK_OPERATORS.find((o) => o.kuraId === kuraId)
}

export function findHubByName(name: string): HubRecord | undefined {
  return MOCK_HUBS.find((h) => h.name === name)
}

export function findAgentByName(name: string): AgentRecord | undefined {
  return MOCK_AGENTS.find((a) => a.name === name)
}

export function findBatteryBySerial(serial: string): BatteryRecord | undefined {
  return MOCK_BATTERIES.find((b) => b.serial === serial)
}

export function findVehicleByReg(reg: string): VehicleRecord | undefined {
  return MOCK_VEHICLES.find((v) => v.regNumber === reg)
}
