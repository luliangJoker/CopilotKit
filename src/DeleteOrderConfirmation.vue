<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  args: { orderId?: string }
  status: string
  respond?: (result: unknown) => Promise<void>
  deleteOrder: (orderId: string) => Promise<boolean>
}>()

// --------------------------- 用户确认 ---------------------------

// 防止重复点击，同一次确认只处理一次。
const answered = ref(false)
const message = ref('')

// 点击确认后，才删除订单并把结果交回 AI。
async function confirmDelete() {
  if (answered.value || !props.respond || props.status !== 'executing') return
  answered.value = true
  const deleted = await props.deleteOrder(props.args.orderId!)
  message.value = deleted ? '订单已删除' : '订单不存在，未删除'
  await props.respond({ confirmed: true, deleted, orderId: props.args.orderId })
}

// 取消只返回结果，不执行删除。
async function cancelDelete() {
  if (answered.value || !props.respond || props.status !== 'executing') return
  answered.value = true
  message.value = '已取消，订单保留'
  await props.respond({ confirmed: false, deleted: false, orderId: props.args.orderId })
}
</script>

<template>
  <section class="confirmation" aria-label="删除订单确认">
    <p v-if="status === 'in-progress'">正在准备确认信息……</p>
    <template v-else-if="status === 'executing' && !answered">
      <p>确认删除模拟订单 {{ args.orderId }}？</p>
      <p>仅删除本地模拟数据，重启后端后恢复。</p>
      <button type="button" @click="cancelDelete">取消</button>
      <button type="button" class="danger" @click="confirmDelete">确认删除</button>
    </template>
    <p v-else-if="message">{{ message }}</p>
    <p v-else>本次确认已结束</p>
  </section>
</template>

<style scoped>
.confirmation {
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}
button {
  padding: 8px 16px;
  margin-right: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
}
.danger {
  background: #b91c1c;
  border-color: #b91c1c;
  color: white;
}
</style>
