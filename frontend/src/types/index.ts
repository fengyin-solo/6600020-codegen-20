export interface ModbusRegister {
  address: number
  name: string
  type: 'coil' | 'discrete' | 'holding' | 'input'
  value: number | boolean
  unit: string
  updatedAt: number
}

export interface Device {
  id: string
  name: string
  ip: string
  port: number
  slaveId: number
  online: boolean
  registers: ModbusRegister[]
}

export interface Alarm {
  id: string
  deviceId: string
  register: string
  message: string
  level: 'info' | 'warning' | 'critical'
  timestamp: number
  acknowledged: boolean
}

export type ShiftType = 'morning' | 'afternoon' | 'night'

export interface Shift {
  type: ShiftType
  name: string
  startHour: number
  endHour: number
}

export interface EnergyMetric {
  name: string
  value: number
  unit: string
  min: number
  max: number
  avg: number
  trend: 'up' | 'down' | 'stable'
}

export interface ShiftEnergyData {
  shift: ShiftType
  shiftName: string
  date: string
  current: EnergyMetric
  pressure: EnergyMetric
  flow: EnergyMetric
  timestamps: number[]
}

export const SHIFTS: Shift[] = [
  { type: 'morning', name: '早班', startHour: 8, endHour: 16 },
  { type: 'afternoon', name: '中班', startHour: 16, endHour: 24 },
  { type: 'night', name: '夜班', startHour: 0, endHour: 8 }
]
