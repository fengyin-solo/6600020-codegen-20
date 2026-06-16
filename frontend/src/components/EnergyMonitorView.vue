<template>
  <div class="flex flex-col gap-3 h-full">
    <div class="flex justify-between items-center">
      <h2 class="text-lg font-bold text-orange-400">能耗监测</h2>
      <div class="flex gap-2 items-center">
        <span class="text-xs text-gray-400">当前班次:</span>
        <span class="text-sm font-bold text-green-400">{{ store.getShiftName(store.getCurrentShift()) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div v-for="m in metricCards" :key="m.label" class="bg-gray-900 rounded-xl p-3 border-l-4" :style="{ borderColor: m.color }">
        <div class="flex justify-between items-start">
          <div>
            <div class="text-xs text-gray-400">{{ m.label }} · {{ m.data.name }}</div>
            <div class="text-3xl font-bold mt-1" :style="{ color: m.color }">
              {{ formatValue(m.data.value) }}
            </div>
            <div class="text-xs text-gray-500">{{ m.data.unit }}</div>
          </div>
          <div class="text-2xl opacity-60">{{ m.icon }}</div>
        </div>
        <div class="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-800 text-xs">
          <div>
            <div class="text-gray-600">最小</div>
            <div class="text-gray-300 font-medium">{{ m.data.min.toFixed(2) }}</div>
          </div>
          <div>
            <div class="text-gray-600">平均</div>
            <div class="text-gray-300 font-medium">{{ m.data.avg.toFixed(2) }}</div>
          </div>
          <div>
            <div class="text-gray-600">趋势</div>
            <div :class="trendClass(m.data.trend)" class="font-medium">{{ trendText(m.data.trend) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-gray-900 rounded-xl p-3 flex-1 flex flex-col">
      <div class="flex justify-between items-center mb-2">
        <h3 class="text-sm text-gray-400">班次趋势</h3>
        <div class="flex gap-1">
          <button v-for="t in metricTabs" :key="t.key" @click="activeMetric = t.key"
            class="px-3 py-1 text-xs rounded transition-colors"
            :class="activeMetric === t.key ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'">
            {{ t.label }}
          </button>
        </div>
      </div>
      <v-chart v-if="shiftChartOption" :option="shiftChartOption" class="flex-1 min-h-0" autoresize />
    </div>

    <div class="bg-gray-900 rounded-xl p-3">
      <h3 class="text-sm text-gray-400 mb-2">班次汇总</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-gray-500 border-b border-gray-800">
              <th class="text-left py-1.5 px-2">日期</th>
              <th class="text-left py-1.5 px-2">班次</th>
              <th class="text-right py-1.5 px-2">电流(A)</th>
              <th class="text-right py-1.5 px-2">压力(MPa)</th>
              <th class="text-right py-1.5 px-2">流量(L/min)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in store.shiftHistoryData.slice().reverse()" :key="idx"
              class="border-b border-gray-800/50 hover:bg-gray-800/50">
              <td class="py-1.5 px-2 text-gray-300">{{ row.date }}</td>
              <td class="py-1.5 px-2">
                <span class="px-1.5 py-0.5 rounded text-xs" :class="shiftClass(row.shift)">{{ row.shiftName }}</span>
              </td>
              <td class="text-right py-1.5 px-2">
                <span class="text-orange-400">{{ row.current.avg.toFixed(2) }}</span>
                <span class="text-gray-600 ml-1">({{ formatTrend(row.current.trend) }})</span>
              </td>
              <td class="text-right py-1.5 px-2">
                <span class="text-cyan-400">{{ row.pressure.avg.toFixed(2) }}</span>
                <span class="text-gray-600 ml-1">({{ formatTrend(row.pressure.trend) }})</span>
              </td>
              <td class="text-right py-1.5 px-2">
                <span class="text-purple-400">{{ row.flow.avg.toFixed(1) }}</span>
                <span class="text-gray-600 ml-1">({{ formatTrend(row.flow.trend) }})</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useModbusStore } from '../store/modbus'
import type { EChartsOption } from 'echarts'
import type { ShiftType, EnergyMetric, ShiftEnergyData } from '../types'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const store = useModbusStore()
const activeMetric = ref<'current' | 'pressure' | 'flow'>('current')

const metricTabs = [
  { key: 'current' as const, label: '电流' },
  { key: 'pressure' as const, label: '压力' },
  { key: 'flow' as const, label: '流量' }
]

const metricCards = computed(() => [
  { label: '电流', data: store.currentMetric, color: '#f97316', icon: '⚡' },
  { label: '压力', data: store.pressureMetric, color: '#22d3ee', icon: '📊' },
  { label: '流量', data: store.flowMetric, color: '#a78bfa', icon: '💧' }
])

function formatValue(v: number): string {
  return v > 100 ? v.toFixed(0) : v.toFixed(2)
}

function trendClass(t: 'up' | 'down' | 'stable'): string {
  if (t === 'up') return 'text-red-400'
  if (t === 'down') return 'text-green-400'
  return 'text-gray-400'
}

function trendText(t: 'up' | 'down' | 'stable'): string {
  if (t === 'up') return '↑ 上升'
  if (t === 'down') return '↓ 下降'
  return '→ 平稳'
}

function shiftClass(type: ShiftType): string {
  switch (type) {
    case 'morning': return 'bg-yellow-900/50 text-yellow-400'
    case 'afternoon': return 'bg-blue-900/50 text-blue-400'
    case 'night': return 'bg-purple-900/50 text-purple-400'
  }
}

function formatTrend(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

const shiftChartOption = computed<EChartsOption | null>(() => {
  if (!store.shiftHistoryData.length) return null
  const categories = store.shiftHistoryData.map(d => `${d.date} ${d.shiftName}`)
  const metricMap: Record<'current' | 'pressure' | 'flow', keyof ShiftEnergyData> = {
    current: 'current',
    pressure: 'pressure',
    flow: 'flow'
  }
  const key = metricMap[activeMetric.value]
  const data = store.shiftHistoryData.map(d => {
    const m = (d as any)[key] as EnergyMetric
    return [m.min, m.max, m.avg]
  })
  const avgData = store.shiftHistoryData.map(d => ((d as any)[key] as EnergyMetric).avg)
  const colorMap: Record<'current' | 'pressure' | 'flow', string> = { current: '#f97316', pressure: '#22d3ee', flow: '#a78bfa' }
  const color = colorMap[activeMetric.value]
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const idx = params[0].dataIndex
        const d = store.shiftHistoryData[idx]
        const m = (d as any)[key] as EnergyMetric
        return `${categories[idx]}<br/>最小: ${m.min.toFixed(2)} ${m.unit}<br/>最大: ${m.max.toFixed(2)} ${m.unit}<br/>平均: ${m.avg.toFixed(2)} ${m.unit}`
      }
    },
    legend: { textStyle: { color: '#999' }, top: 0, data: ['范围', '平均值'] },
    grid: { left: 55, right: 20, top: 35, bottom: 45 },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: '#666', rotate: 30, fontSize: 10 },
      axisLine: { lineStyle: { color: '#374151' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#666' },
      splitLine: { lineStyle: { color: '#1f2937' } }
    },
    series: [
      {
        name: '范围',
        type: 'bar',
        stack: 'range',
        itemStyle: { color: 'transparent' },
        data: data.map(d => d[0]),
        emphasis: { disabled: true }
      },
      {
        name: '范围',
        type: 'bar',
        stack: 'range',
        itemStyle: { color: color, opacity: 0.3 },
        data: data.map(d => d[1] - d[0]),
        barWidth: 20,
        emphasis: { disabled: true }
      },
      {
        name: '平均值',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        data: avgData,
        z: 10
      }
    ]
  }
})
</script>
