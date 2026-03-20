<template>
  <div class="chat-chart-wrapper">
    <div class="chart-header">
      <q-icon name="bar_chart" size="14px" color="teal-7" />
      <span class="chart-title">{{ chartData.title }}</span>
    </div>
    <div class="chart-canvas-wrapper">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Chart,
  LineElement, BarElement, ArcElement,
  PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  LineController, BarController, DoughnutController,
} from 'chart.js'

Chart.register(
  LineElement, BarElement, ArcElement,
  PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
  LineController, BarController, DoughnutController,
)

const props = defineProps({
  chartData: { type: Object, required: true },
})

const canvasRef = ref(null)
let chartInstance = null

const buildConfig = (data) => {
  const isHorizontal = data.horizontal === true
  const isDoughnut = data.type === 'doughnut'

  const tooltipCallbacks = {
    label: (ctx) => {
      const val = ctx.parsed.y ?? ctx.parsed ?? ctx.raw
      if (data.yPrefix) return ` ${data.yPrefix}${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      if (data.ySuffix) return ` ${Number(val).toFixed(1)}${data.ySuffix}`
      return ` ${Number(val).toLocaleString('pt-BR')}`
    },
  }

  if (isDoughnut) {
    tooltipCallbacks.label = (ctx) => {
      const val = ctx.parsed
      return ` R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    }
  }

  const scales = isDoughnut ? {} : {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 }, color: '#9aa0ac', maxRotation: 45 },
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: {
        font: { size: 11 },
        color: '#9aa0ac',
        callback: (val) => {
          if (data.yPrefix) return `${data.yPrefix}${Number(val).toLocaleString('pt-BR')}`
          if (data.ySuffix) return `${val}${data.ySuffix}`
          return val
        },
      },
    },
  }

  if (isHorizontal) {
    // swap axis
    const xCopy = scales.x
    scales.x = { ...scales.y }
    scales.y = { ...xCopy }
    scales.x.ticks = {
      ...scales.x.ticks,
      callback: (val) => {
        if (data.yPrefix) return `${data.yPrefix}${Number(val).toLocaleString('pt-BR')}`
        return val
      },
    }
  }

  return {
    type: isDoughnut ? 'doughnut' : isHorizontal ? 'bar' : data.type,
    data: {
      labels: data.labels,
      datasets: data.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: isHorizontal ? 'y' : 'x',
      plugins: {
        legend: {
          display: isDoughnut || data.datasets.length > 1,
          position: isDoughnut ? 'right' : 'top',
          labels: { font: { size: 12 }, color: '#1a1f36', boxWidth: 12 },
        },
        tooltip: { callbacks: tooltipCallbacks },
      },
      scales,
    },
  }
}

const renderChart = () => {
  if (!canvasRef.value) return
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
  chartInstance = new Chart(canvasRef.value, buildConfig(props.chartData))
}

onMounted(renderChart)
watch(() => props.chartData, renderChart, { deep: true })
onBeforeUnmount(() => { if (chartInstance) chartInstance.destroy() })
</script>

<style scoped>
.chat-chart-wrapper {
  background: #fff;
  border: 1.5px solid #e8edf3;
  border-radius: 10px;
  padding: 14px 16px;
  margin-top: 8px;
  max-width: 560px;
}

.chart-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1f36;
}

.chart-canvas-wrapper {
  position: relative;
  max-height: 260px;
}
</style>
