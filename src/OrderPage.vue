<script setup lang="ts">
import { computed, ref, h } from 'vue'
import { CopilotChat, useFrontendTool, useAgentContext, useHumanInTheLoop } from '@copilotkit/vue/v2'
import type { VueHumanInTheLoopRenderProps } from '@copilotkit/vue/v2'
import { z } from 'zod'
import DeleteOrderConfirmation from './DeleteOrderConfirmation.vue'

type OrderStatus = '待付款' | '待发货' | '已完成'
type OrderFilter = '全部' | OrderStatus

interface Order {
  id: string
  customer: string
  amount: number
  status: OrderStatus
}

// 订单数据：当前使用本地模拟数据。
const orders = ref<Order[]>([
  { id: 'ORD001', customer: '张三', amount: 199, status: '待付款' },
  { id: 'ORD002', customer: '李四', amount: 329, status: '待发货' },
  { id: 'ORD003', customer: '王五', amount: 89, status: '已完成' },
  { id: 'ORD004', customer: '赵六', amount: 259, status: '待发货' },
])

// 筛选状态：只保存用户当前选择的条件。
const filterOptions: OrderFilter[] = ['全部', '待付款', '待发货', '已完成']
const currentStatus = ref<OrderFilter>('全部')

// 展示列表：条件变化时自动重新计算，保留原始订单。
const filteredOrders = computed(() => {
  if (currentStatus.value === '全部') return orders.value
  return orders.value.filter((order) => order.status === currentStatus.value)
})

// 普通业务函数：按钮和 AI 共用同一个筛选入口。
function filterOrders(status: OrderFilter) {
  currentStatus.value = status
}

// --------------------------- 页面状态共享 ---------------------------

// 向 AI 提供最新的筛选条件和显示条数。
useAgentContext({
  description: '订单页面当前的筛选状态和显示条数。用户只询问当前状态时，直接据此回答，不要调用筛选工具改变页面。',
  value: () => ({
    status: currentStatus.value,
    count: filteredOrders.value.length,
  }),
})

// --------------------------- AI 订单筛选 ---------------------------

// 将订单筛选函数提供给 AI。
useFrontendTool({
  name: 'filter_orders',
  description: '按状态筛选页面订单。用户要求只看某种状态或显示全部订单时使用。此工具不能修改或删除订单。',
  parameters: z.object({
    status: z.enum(['全部', '待付款', '待发货', '已完成']),
  }),
  handler: async ({ status }) => {
    filterOrders(status)
    return { applied: true, status, count: filteredOrders.value.length }
  },
})

// --------------------------- 删除订单确认 ---------------------------

// 删除本地模拟订单，返回是否找到并删除。
function deleteOrder(orderId: string) {
  const index = orders.value.findIndex((order) => order.id === orderId)
  if (index === -1) return false
  orders.value.splice(index, 1)
  return true
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
          :aria-pressed="currentStatus === status"
          @click="filterOrders(status)"
        >
          {{ status }}
        </button>
      </div>
      <p>当前筛选：{{ currentStatus }}，显示 {{ filteredOrders.length }} 条订单</p>
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
          <tr v-for="order in filteredOrders" :key="order.id">
            <td>{{ order.id }}</td>
            <td>{{ order.customer }}</td>
            <td>¥{{ order.amount }}</td>
            <td>{{ order.status }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <h2>AI 聊天</h2>
    <div class="chat-panel">
      <CopilotChat />
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
