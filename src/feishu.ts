import * as https from 'https'
import * as crypto from 'crypto'
import * as core from '@actions/core'

export function sign_with_timestamp(timestamp: number, key: string): string {
  const toencstr = `${timestamp}\n${key}`
  const signature = crypto.createHmac('SHA256', toencstr).digest('base64')
  return signature
}

export async function PostToFeishu(
  id: string,
  content: string
): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'open.feishu.cn',
      port: 443,
      path: `/open-apis/bot/v2/hook/${id}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
    const req = https.request(options, res => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
      res.on('error', () => reject(new Error('Feishu response stream failed')))
      res.on('aborted', () => reject(new Error('Feishu response was aborted')))
      res.on('end', () => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(
            new Error(
              `Feishu HTTP request failed (${res.statusCode || 'unknown'})`
            )
          )
          return
        }
        let result: { code?: unknown; StatusCode?: unknown }
        try {
          result = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          reject(new Error('Feishu returned invalid JSON'))
          return
        }
        // HTTP 200 can still carry a rejected card. Only an explicit business
        // success counts as delivery; support both documented webhook envelopes.
        const code = result?.code ?? result?.StatusCode
        if (code !== 0) {
          reject(
            new Error(
              `Feishu rejected the message (code ${typeof code === 'number' ? code : 'missing/invalid'})`
            )
          )
          return
        }
        core.debug('Feishu accepted the message (code 0)')
        resolve(res.statusCode)
      })
    })
    req.setTimeout(15000, () => {
      req.destroy(new Error('Feishu request timed out'))
    })
    req.on('error', () =>
      reject(new Error('Feishu request failed or timed out'))
    )
    req.write(content)
    req.end()
  })
}
