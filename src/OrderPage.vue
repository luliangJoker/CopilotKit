<script setup lang="ts">
import { onMounted, ref, h } from 'vue'
import { CopilotChat, useFrontendTool, useAgentContext, useHumanInTheLoop, useConfigureSuggestions } from '@copilotkit/vue/v2'
import type { VueHumanInTheLoopRenderProps, VueToolCallRendererRenderProps } from '@copilotkit/vue/v2'
import { z } from 'zod'
import DeleteOrderConfirmation from './DeleteOrderConfirmation.vue'
import OrderQueryResult from './OrderQueryResult.vue'

type OrderStatus = '待付款' | '待发货' | '已完成'
type OrderFilter = '全部' | OrderStatus

interface Order {
  id: string
  customer: string
  amount: number
  status: OrderStatus
}

// 页面只保存业务接口返回的列表。
const orders = ref<Order[]>([])
const loading = ref(false)
const queryError = ref('')

// 保存聊天组件报告的错误提示，重新发送消息时清空。
const chatError = ref('')

// --------------------------- 模拟工具权限 ---------------------------

// 演示 AI 工具开关，手动查询按钮仍可使用。
const canQuery = ref(true)

// 筛选状态：只保存用户当前选择的条件。
const filterOptions: OrderFilter[] = ['全部', '待付款', '待发货', '已完成']
const currentStatus = ref<OrderFilter>('全部')

// --------------------------- 订单查询 ---------------------------

// 按钮与 AI 共用查询，接口成功后再更新页面。
async function filterOrders(status: OrderFilter) {
  if (loading.value) throw new Error('订单查询中，请稍后重试')
  loading.value = true
  queryError.value = ''
  try {
    const response = await fetch(`/api/orders?${new URLSearchParams({ status })}`)
    if (!response.ok) throw new Error(`订单查询失败：HTTP ${response.status}`)
    orders.value = await response.json()
    currentStatus.value = status
    return { applied: true, status, count: orders.value.length }
  } catch (error) {
    queryError.value = '订单查询失败，请检查业务接口后重新筛选。'
    throw error
  } finally {
    loading.value = false
  }
}

// 首次进入页面时查询全部订单。
onMounted(async () => {
  await filterOrders('全部')
})

// --------------------------- 页面状态共享 ---------------------------

// 向 AI 提供当前页面状态和可见的订单数据。
useAgentContext({
  description: '订单页面当前状态：status 是筛选条件，count 是显示条数，loading 表示是否正在查询，canQuery 表示是否允许 AI 使用订单查询工具。visibleOrders 是页面当前显示的订单，id 为订单号、customer 为客户、amount 为金额、status 为订单状态；这不是所有订单。用户询问当前页面的信息时，直接据此回答，不要调用筛选工具改变页面；查询中不要把列表当作新条件的查询结果，列表外的订单信息不要编造。',
  value: () => ({
    status: currentStatus.value,
    count: orders.value.length,
    // 告诉 AI 订单列表是否正在查询：true 查询中，false 当前没有查询。
    loading: loading.value,
    canQuery: canQuery.value,
    // 只提供当前列表中的订单，让 AI 能回答订单号、客户和金额等问题。
    visibleOrders: orders.value,
  }),
})

// --------------------------- AI 订单筛选 ---------------------------

// 持续显示快捷提问，点击后由聊天框发送对应消息。
useConfigureSuggestions({
  // 明确指定聊天框使用的助手，让首次连接前也能加载固定快捷提问。
  consumerAgentId: 'default',
  suggestions: [
    { title: '查看待发货订单', message: '帮我只看待发货订单。' },
    { title: '介绍当前列表', message: '当前页面有哪些订单？请列出订单号、客户和金额，不要重新查询。' },
  ],
  available: 'always',
})

// 将订单筛选函数提供给 AI。
useFrontendTool({
  name: 'filter_orders',
  description: '按状态筛选页面订单。用户要求只看某种状态或显示全部订单时使用。此工具不能修改或删除订单。',
  parameters: z.object({
    status: z.enum(['全部', '待付款', '待发货', '已完成']),
  }),
  handler: async ({ status }) => {
    return await filterOrders(status)
  },
  get available() {
    return canQuery.value
  },
  render: (props: VueToolCallRendererRenderProps<{ status: OrderFilter }>) =>
    h(OrderQueryResult, props),
})

// --------------------------- 删除订单确认 ---------------------------

// 保持删除确认功能：调用模拟业务接口后重新查询列表。
async function deleteOrder(orderId: string) {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' })
  if (!response.ok) throw new Error(`删除失败：HTTP ${response.status}`)
  const result: { deleted: boolean } = await response.json()
  await filterOrders(currentStatus.value)
  return result.deleted
}

// 先显示确认界面，等待用户点击后才返回执行结果。
useHumanInTheLoop({
  name: 'delete_order',
  description: '按订单号删除本地模拟订单。必须使用此工具显示确认卡片，等待用户点击确认。取消时不删除。没有具体订单号时先询问，不要编造订单号。',
  parameters: z.object({
    orderId: z.string(),
  }),
  render: (props: VueHumanInTheLoopRenderProps<{ orderId: string }>) =>
    h(DeleteOrderConfirmation, { ...props, deleteOrder }),
})
</script>

<template>
  <main>
    <h1>订单管理 Demo</h1>
    <p>试着对 AI 说：只看待发货订单。也可以点击按钮筛选。</p>

    <section aria-label="订单列表">
      <div class="filters" role="group" aria-label="按订单状态筛选">
        <button
          v-for="status in filterOptions"
          :key="status"
          :disabled="loading"
          :aria-pressed="currentStatus === status"
          @click="filterOrders(status)"
        >
          {{ status }}
        </button>
      </div>
      <p v-if="loading" role="status">正在查询订单……</p>
      <p v-if="queryError" role="alert">{{ queryError }}</p>
      <p>当前筛选：{{ currentStatus }}，显示 {{ orders.length }} 条订单</p>
      <table>
        <thead>
          <tr>
            <th scope="col">订单号</th>
            <th scope="col">客户</th>
            <th scope="col">金额</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.customer }}</td>
            <td>¥{{ order.amount }}</td>
            <td>{{ order.status }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <h2>AI 聊天</h2>
    <label>
      <input v-model="canQuery" type="checkbox">
      允许 AI 调用订单查询工具
    </label>
    <p>AI 查询工具：{{ canQuery ? '可用' : '不可用，手动筛选仍可使用' }}</p>
    <p v-if="chatError" role="alert">{{ chatError }}</p>
    <div class="chat-panel">
      <CopilotChat
        :on-error="() => { chatError = 'AI 聊天出现错误，请检查网络或服务配置后重试。' }"
        @submit-message="chatError = ''"
        @select-suggestion="chatError = ''"
      />
    </div>
  </main>
</template>

<style scoped>
main {
  max-width: 960px;
  margin: 64px auto;
  padding: 0 24px;
  font-family: system-ui, sans-serif;
  color: #1f2937;
  line-height: 1.6;
}

.chat-panel {
  height: 600px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filters button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: inherit;
  cursor: pointer;
  font: inherit;
}

.filters button[aria-pressed='true'] {
  background: #1d4ed8;
  color: white;
  border-color: #1d4ed8;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 8px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}
</style>
