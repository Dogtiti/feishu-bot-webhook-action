import * as https from 'https'

export type ChangelogConfig = {
  apiKey: string
  model: string
  baseUrl: string
  serviceName: string
  commits: string
  compareUrl: string
}

type ChatMessage = {
  role: 'system' | 'user'
  content: string
}

type ChatResponse = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

const SYSTEM_PROMPT = `你是一个专业的产品发版通知撰写者。你的任务是根据 Git commit 记录，生成一份面向产品经理和测试人员的中文发版通知。

要求：
1. 用简洁的中文描述每个功能变更，不要使用技术术语
2. 按「✨ 新功能」「⚡ 改进优化」「🐛 问题修复」三个分类整理
3. 每条更新用一句话概括，让非技术人员能看懂
4. 如果某个分类没有内容，就不要列出该分类
5. 忽略纯技术重构、依赖更新、CI 配置等对用户无感知的变更
6. 如果所有 commit 都是无感知变更，就输出「本次更新为内部技术优化，无面向用户的功能变化」

输出格式严格遵循飞书 lark_md 语法，示例：
**✨ 新功能**
- 新增了 XXX 功能
- 支持了 YYY

**🐛 问题修复**
- 修复了 ZZZ 的问题

注意：不要输出任何分隔线、标题前缀（如 ###）、或额外的开头结尾语句，直接输出分类内容即可。`

function buildUserPrompt(commits: string, serviceName: string): string {
  return `以下是 ${serviceName} 服务最近的 Git commit 记录，请生成发版通知：

${commits}`
}

function parseBaseUrl(baseUrl: string): { hostname: string; basePath: string; port: number; protocol: string } {
  const url = new URL(baseUrl)
  return {
    hostname: url.hostname,
    basePath: url.pathname.replace(/\/$/, ''),
    port: url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80),
    protocol: url.protocol
  }
}

export async function generateChangelog(config: ChangelogConfig): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserPrompt(config.commits, config.serviceName) }
  ]

  const body = JSON.stringify({
    model: config.model,
    messages,
    temperature: 0.3,
    max_tokens: 1024
  })

  const { hostname, basePath, port, protocol } = parseBaseUrl(config.baseUrl)
  const path = `${basePath}/chat/completions`

  const httpModule = protocol === 'https:' ? https : await import('http')

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    }

    const req = httpModule.request(options, res => {
      let data = ''
      res.on('data', chunk => {
        data += chunk.toString()
      })
      res.on('end', () => {
        try {
          const json: ChatResponse = JSON.parse(data)
          const content = json.choices?.[0]?.message?.content
          if (!content) {
            console.error('AI response:', data)
            reject(new Error('AI 返回内容为空'))
            return
          }
          resolve(content.trim())
        } catch (err) {
          console.error('AI response parse error:', data)
          reject(new Error(`解析 AI 响应失败: ${err}`))
        }
      })
    })

    req.on('error', e => {
      reject(new Error(`AI API 请求失败: ${e.message}`))
    })

    req.write(body)
    req.end()
  })
}
