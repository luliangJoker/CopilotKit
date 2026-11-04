import { createServer } from 'node:http'
import { BuiltInAgent, CopilotRuntime } from '@copilotkit/runtime/v2'
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node'

// 密钥只由本地后端读取，不放进 Vue 页面。
if (!process.env.OPENAI_API_KEY?.trim()) {
  throw new Error('请先在 .env.local 中填写 PackyAPI 的完整 API Key，再启动后端。')
}

// 配置负责调用大模型的默认助手。
const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: `openai:${process.env.AI_MODEL}`,
      prompt: '你是订单管理页面的助手，请用简洁、通俗的中文回答。',
    }),
  },
})

// 在本机提供聊天接口，供 Vue 页面调用。
createServer(
  createCopilotNodeListener({
    runtime,
    basePath: '/api/copilotkit',
    cors: true,
  }),
).listen(8200, '127.0.0.1', () => {
  console.log('AI 后端已启动：http://127.0.0.1:8200/api/copilotkit')
})
