<script setup lang="ts">
import { ToolCallStatus } from '@copilotkit/vue/v2'
// --------------------------- 工具执行信息 ---------------------------

// CopilotKit 自动传入本次参数、执行阶段和结果。
defineProps<{
  args: { status?: string }
  status: ToolCallStatus
  result?: string
}>()
</script>

<template>
  <section class="query-result" aria-label="订单查询结果" aria-live="polite">
    <p v-if="status === ToolCallStatus.InProgress">正在准备查询条件……</p>
    <p v-else-if="status === ToolCallStatus.Executing">正在查询{{ args.status }}订单……</p>
    <template v-else-if="status === ToolCallStatus.Complete && result">
      <strong>订单查询完成</strong>
      <p>状态：{{ JSON.parse(result).status }}</p>
      <p>数量：{{ JSON.parse(result).count }} 条</p>
    </template>
  </section>
</template>

<style scoped>
.query-result {
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
.query-result p {
  margin: 8px 0;
}
</style>
