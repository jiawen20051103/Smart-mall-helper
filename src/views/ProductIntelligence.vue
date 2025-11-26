<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

type Product = {
  name: string
  sku: string
  sales: number
  revenue: number
  profitRate: number
  stock: number
  status: '热销' | '平稳' | '需关注'
}

const filterForm = reactive({
  keyword: '',
  status: '全部',
})

const products = ref<Product[]>([
  { name: '轻盈真丝衬衫', sku: 'SMH-1001', sales: 1862, revenue: 256000, profitRate: 36, stock: 420, status: '热销' },
  { name: '智能恒温杯', sku: 'SMH-1002', sales: 1340, revenue: 168200, profitRate: 48, stock: 120, status: '需关注' },
  { name: '腰部按摩仪', sku: 'SMH-1003', sales: 980, revenue: 212600, profitRate: 42, stock: 75, status: '需关注' },
  { name: '清新护肤组合', sku: 'SMH-1004', sales: 1560, revenue: 188000, profitRate: 33, stock: 680, status: '平稳' },
  { name: '暖光香薰机', sku: 'SMH-1005', sales: 880, revenue: 132400, profitRate: 38, stock: 950, status: '平稳' },
])

const filteredProducts = computed(() =>
  products.value.filter((item) => {
    const matchKeyword =
      !filterForm.keyword ||
      item.name.toLowerCase().includes(filterForm.keyword.toLowerCase()) ||
      item.sku.toLowerCase().includes(filterForm.keyword.toLowerCase())
    const matchStatus = filterForm.status === '全部' || item.status === filterForm.status
    return matchKeyword && matchStatus
  }),
)

const supplyRecommendations = computed(() =>
  [...products.value]
    .filter((item) => item.stock < 200)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3),
)

const promotionCandidates = computed(() =>
  [...products.value]
    .filter((item) => item.profitRate >= 35 && item.sales > 1000)
    .sort((a, b) => b.profitRate - a.profitRate)
    .slice(0, 3),
)

const statusType = (status: Product['status']) => {
  if (status === '热销') return 'success'
  if (status === '需关注') return 'danger'
  return 'info'
}
</script>

<template>
  <div class="product-page">
    <section class="panel">
      <div class="page-title">商品智能分析</div>
      <div class="page-subtitle">联动销量、利润与库存，定位最需关注的商品</div>
      <el-form :model="filterForm" inline class="filter-form">
        <el-form-item>
          <el-input v-model="filterForm.keyword" placeholder="输入商品名称或 SKU 搜索" clearable />
        </el-form-item>
        <el-form-item label="商品状态">
          <el-select v-model="filterForm.status" style="width: 160px">
            <el-option label="全部" value="全部" />
            <el-option label="热销" value="热销" />
            <el-option label="平稳" value="平稳" />
            <el-option label="需关注" value="需关注" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary">智能筛选</el-button>
          <el-button>清空</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="panel">
      <div class="section-header">
        <div>
          <div class="section-title">商品概览</div>
          <p class="tag-muted">实时计算销量、销售额、利润与库存健康度</p>
        </div>
        <el-button type="primary" link>导出分析报告</el-button>
      </div>
      <el-table :data="filteredProducts" border stripe>
        <el-table-column prop="name" label="商品名称" min-width="180" />
        <el-table-column prop="sku" label="SKU" width="120" />
        <el-table-column prop="sales" label="销量" width="100" />
        <el-table-column prop="revenue" label="销售额" width="120">
          <template #default="{ row }">¥ {{ row.revenue.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="profitRate" label="毛利率" width="100">
          <template #default="{ row }">{{ row.profitRate }}%</template>
        </el-table-column>
        <el-table-column prop="stock" label="当前库存" width="120" />
        <el-table-column prop="status" label="智能评价" width="120">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="plain">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="AI 建议" min-width="220">
          <template #default="{ row }">
            <span class="tag-muted" v-if="row.status === '热销'">保持推广频次，建议提高库存上限</span>
            <span class="tag-muted" v-else-if="row.status === '平稳'">表现稳定，可联动搭售提升客单</span>
            <span class="tag-muted" v-else>库存告急，建议立即补货并缩短发货时效</span>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-row :gutter="20">
      <el-col :xs="24" :md="12">
        <section class="panel recommendation-panel">
          <div class="section-header">
            <div class="section-title">补货优先级</div>
            <el-tag type="danger" effect="plain">实时监控</el-tag>
          </div>
          <el-empty v-if="supplyRecommendations.length === 0" description="暂无补货提醒" />
          <div v-else class="recommendation-list">
            <div v-for="item in supplyRecommendations" :key="item.sku" class="recommendation-item">
              <div>
                <div class="item-title">{{ item.name }}</div>
                <p class="tag-muted">SKU {{ item.sku }} · 库存 {{ item.stock }}</p>
              </div>
              <el-button type="primary" text>去补货</el-button>
            </div>
          </div>
        </section>
      </el-col>
      <el-col :xs="24" :md="12">
        <section class="panel recommendation-panel">
          <div class="section-header">
            <div class="section-title">促销推荐</div>
            <el-tag type="success" effect="plain">高利润 · 高转化</el-tag>
          </div>
          <div class="recommendation-list">
            <div v-for="item in promotionCandidates" :key="item.sku" class="recommendation-item">
              <div>
                <div class="item-title">{{ item.name }}</div>
                <p class="tag-muted">
                  利润率 {{ item.profitRate }}% · 近 7 天销量 {{ item.sales }}
                </p>
              </div>
              <el-button type="primary" text>生成营销方案</el-button>
            </div>
          </div>
        </section>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.product-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-form {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
}

.recommendation-panel {
  min-height: 260px;
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recommendation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2d3d;
}
</style>

