<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const behaviorChartRef = ref<HTMLDivElement>()
const segmentChartRef = ref<HTMLDivElement>()
let behaviorChart: echarts.ECharts | null = null
let segmentChart: echarts.ECharts | null = null

const frequencyData = {
  categories: ['高频', '中频', '低频'],
  purchase: [18, 46, 36],
  avgOrder: [398, 266, 168],
}

const segments = [
  { label: '新用户', value: 24, desc: '首购 30 天内 · 高潜力转化' },
  { label: '活跃用户', value: 52, desc: '月均 2+ 次购买 · 推荐核心' },
  { label: '流失预警', value: 24, desc: '45 天无购买 · 需唤醒' },
]

const strategies = [
  {
    title: '活跃用户 · 个性化推荐',
    detail: '推送「真丝衬衫 + 香薰机」组合，提升客单至 ¥420',
  },
  {
    title: '新用户 · 首购激励',
    detail: '首单 95 折 + 48 小时内发货提醒，提升首购体验',
  },
  {
    title: '流失用户 · 唤醒补贴',
    detail: '发放 20 元退货无忧券，减少换季退货顾虑',
  },
]

const initBehaviorChart = () => {
  if (!behaviorChartRef.value) return
  behaviorChart = echarts.init(behaviorChartRef.value)
  behaviorChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['购买占比', '客单价'], top: 0 },
    grid: { left: '4%', right: '4%', bottom: '8%', containLabel: true },
    xAxis: { type: 'category', data: frequencyData.categories },
    yAxis: [
      { type: 'value', name: '占比(%)' },
      { type: 'value', name: '客单价(¥)' },
    ],
    series: [
      {
        name: '购买占比',
        type: 'bar',
        data: frequencyData.purchase,
        barWidth: 36,
        itemStyle: { borderRadius: 12, color: '#3f8cff' },
      },
      {
        name: '客单价',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: frequencyData.avgOrder,
        color: '#fb923c',
      },
    ],
  })
}

const initSegmentChart = () => {
  if (!segmentChartRef.value) return
  segmentChart = echarts.init(segmentChartRef.value)
  segmentChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '用户分层',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 12, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}: {d}%' },
        data: segments.map((item) => ({ value: item.value, name: item.label })),
      },
    ],
  })
}

const handleResize = () => {
  behaviorChart?.resize()
  segmentChart?.resize()
}

onMounted(() => {
  initBehaviorChart()
  initSegmentChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  behaviorChart?.dispose()
  segmentChart?.dispose()
})
</script>

<template>
  <div class="insights-page">
    <section class="panel hero">
      <div>
        <div class="page-title">用户洞察分析</div>
        <div class="page-subtitle">洞察购买频次、偏好品类与分层结构，驱动个性化策略</div>
      </div>
      <el-tag effect="dark" type="primary">实时同步会员中心</el-tag>
    </section>

    <el-row :gutter="20">
      <el-col :xs="24" :lg="14">
        <section class="panel chart-panel">
          <div class="section-header">
            <div>
              <div class="section-title">用户行为分析</div>
              <p class="tag-muted">对比不同频次人群的占比与客单价表现</p>
            </div>
            <el-button text type="primary">查看明细</el-button>
          </div>
          <div ref="behaviorChartRef" class="chart"></div>
        </section>
      </el-col>
      <el-col :xs="24" :lg="10">
        <section class="panel chart-panel">
          <div class="section-header">
            <div class="section-title">用户分层</div>
            <el-tag type="info" effect="plain">RFM + 行为标签</el-tag>
          </div>
          <div ref="segmentChartRef" class="chart small"></div>
          <el-divider />
          <ul class="segment-list">
            <li v-for="item in segments" :key="item.label">
              <strong>{{ item.label }}</strong>
              <span>{{ item.desc }}</span>
            </li>
          </ul>
        </section>
      </el-col>
    </el-row>

    <section class="panel">
      <div class="section-header">
        <div>
          <div class="section-title">个性化推荐策略</div>
          <p class="tag-muted">基于用户行为与商品表现实时生成建议</p>
        </div>
        <el-button type="primary">同步至营销中心</el-button>
      </div>
      <el-row :gutter="16">
        <el-col v-for="item in strategies" :key="item.title" :xs="24" :md="8">
          <div class="strategy-card">
            <div class="strategy-title">{{ item.title }}</div>
            <p>{{ item.detail }}</p>
          </div>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<style scoped>
.insights-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart {
  width: 100%;
  height: 320px;
}

.chart.small {
  height: 260px;
}

.segment-list {
  list-style: none;
  padding-left: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: var(--text-muted);
}

.segment-list strong {
  color: #1f2d3d;
  margin-right: 8px;
}

.strategy-card {
  background: #f7fbff;
  border-radius: 16px;
  padding: 18px;
  box-shadow: inset 0 0 0 1px #dbe4f3;
  min-height: 120px;
}

.strategy-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #1f2d3d;
}
</style>

