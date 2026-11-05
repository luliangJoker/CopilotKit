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

// --------------------------- 模拟订单接口 ---------------------------

// 用内存模拟业务后端，重启服务后恢复订单。
const orders = [
  { id: 'ORD001', customer: '张三', amount: 199, status: '待付款' },
  { id: 'ORD002', customer: '李四', amount: 329, status: '待发货' },
  { id: 'ORD003', customer: '王五', amount: 89, status: '已完成' },
  { id: 'ORD004', customer: '赵六', amount: 259, status: '待发货' },
]

const chatListener = createCopilotNodeListener({
    runtime,
    basePath: '/api/copilotkit',
    cors: true,
})

// 业务接口由我们编写，聊天接口交给 CopilotKit。
createServer((request, response) => {
  const url = new URL(request.url!, 'http://127.0.0.1:8200')
  if (url.pathname === '/api/orders' && request.method === 'GET') {
    const status = url.searchParams.get('status')
    if (!['全部', '待付款', '待发货', '已完成'].includes(status!)) {
      response.writeHead(400).end('订单状态不正确')
      return
    }
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify(status === '全部' ? orders : orders.filter((order) => order.status === status)))
    return
  }
  if (url.pathname.startsWith('/api/orders/') && request.method === 'DELETE') {
    const index = orders.findIndex((order) => order.id === decodeURIComponent(url.pathname.slice('/api/orders/'.length)))
    const deleted = index !== -1
    if (deleted) orders.splice(index, 1)
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    response.end(JSON.stringify({ deleted }))
    return
  }
  return chatListener(request, response)
}).listen(8200, '127.0.0.1', () => {
  console.log('AI 后端已启动：http://127.0.0.1:8200/api/copilotkit')
})
