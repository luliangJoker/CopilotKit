<script setup lang="ts">
import { computed } from 'vue'
import { ToolCallStatus } from '@copilotkit/vue/v2'

// --------------------------- 工具执行结果 ---------------------------

// CopilotKit 提供执行阶段和序列化后的工具结果。
const props = defineProps<{
  status: ToolCallStatus
  result?: string
}>()

// handler 返回的对象在展示时是 JSON 字符串，解析后读取金额和条数。
const calculation = computed(() => props.result ? JSON.parse(props.result) : undefined)
</script>

<template>
  <section class="total-result" aria-label="订单金额计算结果" aria-live="polite">
    <p v-if="status === ToolCallStatus.InProgress">正在准备查询条件……</p>
    <p v-else-if="status === ToolCallStatus.Executing">正在查询订单并计算总金额……</p>
    <template v-else-if="status === ToolCallStatus.Complete">
      <template v-if="typeof calculation?.total === 'number'">
        <strong>金额计算完成</strong>
        <p>筛选状态：{{ calculation.status }}</p>
        <p>总金额：{{ calculation.total }} 元</p>
        <p>参与计算：{{ calculation.count }} 条订单</p>
        <p v-if="typeof calculation.average === 'number'">平均每单：{{ calculation.average.toFixed(2) }} 元</p>
      </template>
      <p v-else>本次计算未返回有效金额，请重试。</p>
    </template>
  </section>
</template>

<style scoped>
.total-result {
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
.total-result p {
  margin: 8px 0;
}
</style>
