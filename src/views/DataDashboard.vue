<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
])

const trendChartRef = ref<HTMLDivElement>()
const orderChartRef = ref<HTMLDivElement>()
let trendChart: echarts.ECharts | null = null
let orderChart: echarts.ECharts | null = null

const trendRange = ref('7 天')

const metrics = reactive([
  { label: '今日销售额', value: '¥ 1,286,520', trend: '+18.6%', desc: '较昨日提升' },
  { label: '今日订单数', value: '8,213', trend: '+12.4%', desc: '客单价 ¥156.7' },
  { label: '活跃用户', value: '52,870', trend: '+9.1%', desc: '转化率 5.8%' },
  { label: '广告投产', value: 'ROAS 6.2', trend: '+0.7', desc: '消耗 ¥210,000' },
])

const alerts = [
  { title: '3 个 SKU 库存低于安全值', level: 'warning', time: '5 分钟前' },
  { title: '检测到 12 单异常退款', level: 'danger', time: '12 分钟前' },
  { title: '华东大区广告点击异常上升', level: 'info', time: '25 分钟前' },
]

const trendDataMap = {
  '7 天': {
    dates: ['11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14'],
    sales: [740, 820, 900, 1650, 1180, 980, 940],
    orders: [5200, 6000, 6800, 11800, 8200, 7600, 7400],
  },
  '15 天': {
    dates: ['11-10', '11-11', '11-12', '11-13', '11-14', '11-15', '11-16', '11-17', '11-18', '11-19', '11-20', '11-21', '11-22', '11-23', '11-24'],
    sales: [780, 1650, 1420, 1180, 980, 940, 910, 960, 1120, 1180, 1240, 1190, 1286, 1320, 1260],
    orders: [5400, 11800, 10200, 8600, 7200, 6900, 6600, 7100, 7400, 7300, 7600, 7200, 8213, 8400, 8000],
  },
  '30 天': {
    dates: Array.from({ length: 30 }, (_, i) => {
      const day = (i + 1).toString().padStart(2, '0')
      return `11-${day}`
    }),
    sales: [
      620, 640, 660, 610, 640, 670, 700, 720, 840, 1060,
      1650, 1200, 1100, 980, 940, 910, 960, 1020, 980, 960,
      1020, 980, 960, 1020, 1080, 1140, 1190, 1240, 1286, 1320,
    ],
    orders: [
      3600, 3700, 3800, 4000, 4200, 4400, 4600, 4800, 5000, 5200,
      11800, 9000, 8200, 7800, 7400, 7000, 6900, 6600, 6800, 7000,
      7200, 7100, 6900, 6600, 7100, 7400, 7300, 7600, 7800, 8000,
    ],
  },
} as const

const orderStats = {
  categories: ['及时发货', '延迟发货', '售后处理中'],
  values: [86, 9, 5],
}

const updateTrendChart = () => {
  if (!trendChart) return
  const trendData = trendDataMap[trendRange.value as keyof typeof trendDataMap]
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['销售额(万)', '订单数'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '12%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: trendData.dates },
    yAxis: [
      { type: 'value', name: '销售额(万)' },
      { type: 'value', name: '订单数' },
    ],
    series: [
      {
        name: '销售额(万)',
        type: 'line',
        smooth: true,
        data: trendData.sales,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(63,140,255,0.35)' },
            { offset: 1, color: 'rgba(63,140,255,0)' },
          ]),
        },
      },
      {
        name: '订单数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: trendData.orders,
        color: '#34d399',
      },
    ],
  })
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  trendChart = echarts.init(trendChartRef.value)
  updateTrendChart()
}

const initOrderChart = () => {
  if (!orderChartRef.value) return
  orderChart = echarts.init(orderChartRef.value)
  orderChart.setOption({
    title: { text: '订单健康度', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    grid: { left: '8%', right: '4%', bottom: '4%', top: '18%', containLabel: true },
    xAxis: { type: 'value', max: 100 },
    yAxis: { type: 'category', data: orderStats.categories },
    series: [
      {
        type: 'bar',
        data: orderStats.values,
        color: ['#3f8cff', '#f97316', '#f43f5e'],
        barWidth: 20,
        label: { show: true, position: 'right', formatter: '{c}%' },
      },
    ],
  })
}

const handleResize = () => {
  trendChart?.resize()
  orderChart?.resize()
}

onMounted(() => {
  initTrendChart()
  initOrderChart()
  window.addEventListener('resize', handleResize)
})

watch(trendRange, () => {
  updateTrendChart()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  orderChart?.dispose()
})
</script>

<template>
  <div class="dashboard">
    <section class="panel hero">
      <div>
        <div class="page-title">智能数据仪表盘</div>
        <div class="page-subtitle">实时监控核心经营指标，异常预警即时推送</div>
      </div>
      <el-tag size="large" effect="dark" type="success">今日预测完成率 92%</el-tag>
    </section>

    <el-row :gutter="20">
      <el-col v-for="metric in metrics" :key="metric.label" :xs="24" :sm="12" :lg="6">
        <div class="panel metric-card">
          <div class="tag-muted">{{ metric.label }}</div>
          <div class="metric-value">{{ metric.value }}</div>
          <div class="metric-footer">
            <span class="metric-trend">{{ metric.trend }}</span>
            <span class="tag-muted">{{ metric.desc }}</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <section class="panel trend-panel">
      <div class="section-header">
        <div>
          <div class="section-title">核心指标趋势</div>
          <p class="tag-muted">聚焦近 7 天销售额与订单数变化</p>
        </div>
        <el-radio-group v-model="trendRange" size="small" class="range-selector">
          <el-radio-button label="7 天" />
          <el-radio-button label="15 天" />
          <el-radio-button label="30 天" />
        </el-radio-group>
      </div>
      <div ref="trendChartRef" class="chart"></div>
    </section>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <section class="panel alerts-panel">
          <div class="section-header">
            <div class="section-title">快速预警</div>
            <el-tag type="info" effect="plain">自动巡检 · 每 5 分钟更新</el-tag>
          </div>
          <el-timeline>
            <el-timeline-item
              v-for="alert in alerts"
              :key="alert.title"
              :type="alert.level"
              :timestamp="alert.time"
            >
              {{ alert.title }}
            </el-timeline-item>
          </el-timeline>
        </section>
      </el-col>
      <el-col :xs="24" :lg="10">
        <section class="panel order-panel">
          <div class="section-header">
            <div class="section-title">履约健康度</div>
            <el-tag type="success" effect="plain">自动监控</el-tag>
          </div>
          <div ref="orderChartRef" class="chart small"></div>
          <el-divider />
          <ul class="order-tips">
            <li>延迟发货订单集中在「爆款礼包」SKU，建议提升备货</li>
            <li>售后处理中主要为「破损」问题，可优化包装及揽收</li>
          </ul>
        </section>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-card {
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.chart {
  width: 100%;
  height: 320px;
}

.chart.small {
  height: 260px;
}

.order-tips {
  list-style: none;
  padding-left: 0;
  color: var(--text-muted);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alerts-panel :deep(.el-timeline-item__node) {
  box-shadow: 0 0 0 3px rgba(63, 140, 255, 0.15);
}

.range-selector :deep(.el-radio-button__inner) {
  border-radius: 999px !important;
  margin-left: 8px;
  border: 1px solid #dbe4f3;
  color: var(--text-muted);
}

.range-selector :deep(.is-active .el-radio-button__inner) {
  background-color: #3f8cff;
  border-color: #3f8cff;
  color: #fff;
  box-shadow: 0 8px 16px rgba(63, 140, 255, 0.25);
}
</style>

