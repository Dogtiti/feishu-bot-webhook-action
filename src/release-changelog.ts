import * as core from '@actions/core'
import { context } from '@actions/github'
import { sign_with_timestamp, PostToFeishu } from './feishu'
import { generateChangelog } from './changelog'
import { BuildReleaseChangelogCard } from './release-card'

const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1'

export async function PostReleaseChangelog(): Promise<number | undefined> {
  const webhook = core.getInput('webhook') || process.env.FEISHU_BOT_WEBHOOK || ''
  const signKey = core.getInput('signkey') || process.env.FEISHU_BOT_SIGNKEY || ''
  const aiApiKey = core.getInput('ai_api_key') || process.env.AI_API_KEY || ''
  const aiModel = core.getInput('ai_model') || process.env.AI_MODEL || DEFAULT_MODEL
  const aiBaseUrl =
    core.getInput('ai_base_url') || process.env.AI_BASE_URL || DEFAULT_BASE_URL
  const serviceName = core.getInput('service_name') || process.env.SERVICE_NAME || ''
  const commits = core.getInput('commits') || ''
  const commitCount = parseInt(core.getInput('commit_count') || '0', 10)
  const compareUrl = core.getInput('compare_url') || ''
  const tagName = core.getInput('tag_name') || ''

  if (!webhook) {
    core.setFailed('webhook is required')
    return undefined
  }
  if (!aiApiKey) {
    core.setFailed('ai_api_key is required for release-changelog mode')
    return undefined
  }
  if (!commits) {
    core.setFailed('commits is required for release-changelog mode')
    return undefined
  }

  const actor = context.actor || 'unknown'

  console.log(`Generating changelog for ${serviceName} (${tagName})...`)
  console.log(`Using model: ${aiModel} via ${aiBaseUrl}`)
  console.log(`Commits:\n${commits}`)

  const changelog = await generateChangelog({
    apiKey: aiApiKey,
    model: aiModel,
    baseUrl: aiBaseUrl,
    serviceName,
    commits,
    compareUrl
  })

  console.log(`Generated changelog:\n${changelog}`)

  const webhookId = webhook.slice(webhook.indexOf('hook/') + 5)
  const tm = Math.floor(Date.now() / 1000)
  const sign = sign_with_timestamp(tm, signKey)

  const cardMsg = BuildReleaseChangelogCard({
    timestamp: tm,
    sign,
    serviceName,
    tagName,
    changelog,
    compareUrl,
    commitCount,
    actor
  })

  return PostToFeishu(webhookId, cardMsg)
}
