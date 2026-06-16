import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Device, Alarm, ModbusRegister, ShiftEnergyData, EnergyMetric, ShiftType } from '../types'
import { SHIFTS } from '../types'

export const useModbusStore = defineStore('modbus', () => {
  const devices = ref<Device[]>([])
  const alarms = ref<Alarm[]>([])
  const historyData = ref<Record<string, { time: number[]; values: number[] }>>({})
  const isPolling = ref(false)
  const pollInterval = ref(1000)
  const selectedDevice = ref<Device | null>(null)
  const shiftHistoryData = ref<ShiftEnergyData[]>([])

  const criticalAlarms = computed(() => alarms.value.filter(a => a.level === 'critical' && !a.acknowledged))
  const onlineDevices = computed(() => devices.value.filter(d => d.online))

  function getCurrentShift(): ShiftType {
    const hour = new Date().getHours()
    if (hour >= 8 && hour < 16) return 'morning'
    if (hour >= 16 && hour < 24) return 'afternoon'
    return 'night'
  }

  function getShiftName(type: ShiftType): string {
    return SHIFTS.find(s => s.type === type)?.name || type
  }

  function findRegisterByKeyword(keyword: string): { device: Device; register: ModbusRegister } | null {
    for (const dev of devices.value) {
      const reg = dev.registers.find(r => r.name.includes(keyword) && typeof r.value === 'number')
      if (reg) return { device: dev, register: reg }
    }
    return null
  }

  function getHistoryValues(keyword: string, count = 50): { time: number[]; values: number[] } {
    const result: { time: number[]; values: number[] } = { time: [], values: [] }
    const found = findRegisterByKeyword(keyword)
    if (!found) return result
    const key = `${found.device.id}_${found.register.address}`
    const hd = historyData.value[key]
    if (hd) {
      const start = Math.max(0, hd.time.length - count)
      result.time = hd.time.slice(start)
      result.values = hd.values.slice(start)
    }
    return result
  }

  function computeMetric(keyword: string, unit: string): EnergyMetric {
    const found = findRegisterByKeyword(keyword)
    const hd = getHistoryValues(keyword, 100)
    const current = found && typeof found.register.value === 'number' ? found.register.value : 0
    const values = hd.values.length ? hd.values : [current]
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (values.length >= 2) {
      const last = values[values.length - 1]
      const prev = values[values.length - 2]
      const diff = (last - prev) / prev
      if (diff > 0.01) trend = 'up'
      else if (diff < -0.01) trend = 'down'
    }
    return { name: keyword, value: current, unit, min, max, avg, trend }
  }

  const currentMetric = computed(() => computeMetric('电流', 'A'))
  const pressureMetric = computed(() => computeMetric('压力', 'MPa'))
  const flowMetric = computed(() => computeMetric('流量', 'L/min'))

  function generateShiftHistory() {
    const data: ShiftEnergyData[] = []
    const today = new Date()
    for (let dayOffset = 2; dayOffset >= 0; dayOffset--) {
      const d = new Date(today)
      d.setDate(d.getDate() - dayOffset)
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`
      for (const shift of SHIFTS) {
        const baseCurrent = 10 + Math.random() * 8
        const basePressure = 2.5 + Math.random() * 2
        const baseFlow = 120 + Math.random() * 80
        const timestamps: number[] = []
        for (let i = 0; i < 8; i++) {
          const ts = new Date(d)
          ts.setHours(shift.startHour + i, 0, 0, 0)
          timestamps.push(ts.getTime())
        }
        data.push({
          shift: shift.type,
          shiftName: shift.name,
          date: dateStr,
          current: {
            name: '电流', value: baseCurrent, unit: 'A',
            min: baseCurrent * 0.85, max: baseCurrent * 1.15,
            avg: baseCurrent, trend: Math.random() > 0.5 ? 'up' : 'down'
          },
          pressure: {
            name: '压力', value: basePressure, unit: 'MPa',
            min: basePressure * 0.9, max: basePressure * 1.1,
            avg: basePressure, trend: Math.random() > 0.5 ? 'up' : 'down'
          },
          flow: {
            name: '流量', value: baseFlow, unit: 'L/min',
            min: baseFlow * 0.88, max: baseFlow * 1.12,
            avg: baseFlow, trend: Math.random() > 0.5 ? 'up' : 'down'
          },
          timestamps
        })
      }
    }
    shiftHistoryData.value = data
  }

  function updateCurrentShiftData() {
    const currentShift = getCurrentShift()
    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}`
    let entry = shiftHistoryData.value.find(d => d.date === dateStr && d.shift === currentShift)
    if (!entry) {
      entry = {
        shift: currentShift,
        shiftName: getShiftName(currentShift),
        date: dateStr,
        current: computeMetric('电流', 'A'),
        pressure: computeMetric('压力', 'MPa'),
        flow: computeMetric('流量', 'L/min'),
        timestamps: [now.getTime()]
      }
      shiftHistoryData.value.push(entry)
    } else {
      entry.current = computeMetric('电流', 'A')
      entry.pressure = computeMetric('压力', 'MPa')
      entry.flow = computeMetric('流量', 'L/min')
      entry.timestamps.push(now.getTime())
    }
  }

  function initMockDevices() {
    generateShiftHistory()
    devices.value = [
      {
        id: 'dev1', name: '温湿度传感器-A区', ip: '192.168.1.101', port: 502, slaveId: 1, online: true,
        registers: [
          { address: 0, name: '温度', type: 'holding', value: 25.6, unit: '°C', updatedAt: Date.now() },
          { address: 1, name: '湿度', type: 'holding', value: 62.3, unit: '%RH', updatedAt: Date.now() },
          { address: 2, name: '露点', type: 'holding', value: 17.8, unit: '°C', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev2', name: '压力变送器-B区', ip: '192.168.1.102', port: 502, slaveId: 2, online: true,
        registers: [
          { address: 0, name: '管道压力', type: 'holding', value: 3.45, unit: 'MPa', updatedAt: Date.now() },
          { address: 1, name: '差压', type: 'holding', value: 0.12, unit: 'kPa', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev3', name: '电机控制器-C区', ip: '192.168.1.103', port: 502, slaveId: 3, online: false,
        registers: [
          { address: 0, name: '转速', type: 'holding', value: 1480, unit: 'RPM', updatedAt: Date.now() },
          { address: 1, name: '电流', type: 'holding', value: 12.5, unit: 'A', updatedAt: Date.now() },
          { address: 2, name: '运行状态', type: 'coil', value: true, unit: '', updatedAt: Date.now() },
        ]
      },
      {
        id: 'dev4', name: '流量计-D区', ip: '192.168.1.104', port: 502, slaveId: 4, online: true,
        registers: [
          { address: 0, name: '瞬时流量', type: 'holding', value: 156.7, unit: 'L/min', updatedAt: Date.now() },
          { address: 1, name: '累计流量', type: 'holding', value: 98234, unit: 'L', updatedAt: Date.now() },
        ]
      },
    ]
    selectedDevice.value = devices.value[0]
  }

  function simulatePoll() {
    for (const dev of devices.value) {
      if (!dev.online) continue
      for (const reg of dev.registers) {
        if (typeof reg.value === 'number') {
          const noise = (Math.random() - 0.5) * reg.value * 0.02
          reg.value = Math.round((reg.value + noise) * 100) / 100
          reg.updatedAt = Date.now()
          const key = `${dev.id}_${reg.address}`
          if (!historyData.value[key]) historyData.value[key] = { time: [], values: [] }
          historyData.value[key].time.push(Date.now())
          historyData.value[key].values.push(reg.value)
          if (historyData.value[key].time.length > 100) {
            historyData.value[key].time.shift()
            historyData.value[key].values.shift()
          }
          // Check thresholds
          if (reg.name === '温度' && reg.value > 28) {
            alarms.value.unshift({
              id: `a_${Date.now()}`, deviceId: dev.id, register: reg.name,
              message: `${dev.name} ${reg.name}超限: ${reg.value}${reg.unit}`,
              level: reg.value > 30 ? 'critical' : 'warning',
              timestamp: Date.now(), acknowledged: false
            })
          }
        }
      }
    }
    if (alarms.value.length > 50) alarms.value = alarms.value.slice(0, 50)
    updateCurrentShiftData()
  }

  function acknowledgeAlarm(id: string) {
    const a = alarms.value.find(a => a.id === id)
    if (a) a.acknowledged = true
  }

  function toggleDevice(id: string) {
    const d = devices.value.find(d => d.id === id)
    if (d) d.online = !d.online
  }

  return {
    devices, alarms, historyData, isPolling, pollInterval, selectedDevice, shiftHistoryData,
    criticalAlarms, onlineDevices, currentMetric, pressureMetric, flowMetric,
    initMockDevices, simulatePoll, acknowledgeAlarm, toggleDevice,
    getCurrentShift, getShiftName, getHistoryValues
  }
})
