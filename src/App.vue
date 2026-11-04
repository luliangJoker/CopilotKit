<script setup lang="ts">
import { CopilotKitProvider } from '@copilotkit/vue/v2'
import OrderPage from './OrderPage.vue'
</script>

<template>
  <!-- 子组件中的聊天框和工具共用这个后端连接。 -->
  <CopilotKitProvider runtime-url="http://127.0.0.1:8200/api/copilotkit">
    <OrderPage />
  </CopilotKitProvider>
</template>
