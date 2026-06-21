import * as core from '@actions/core'
import { sign_with_timestamp, PostToFeishu } from './feishu'
import {
  BuildPullRequestReminderCard,
  StalePullRequest
} from './pr-reminder-card'

function parseNumberInput(name: string, fallback: number): number {
  const value = parseInt(core.getInput(name) || `${fallback}`, 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function parsePullRequests(input: string): StalePullRequest[] {
  if (!input.trim()) {
    return []
  }

  const value: unknown = JSON.parse(input)
  if (!Array.isArray(value)) {
    throw new Error('stale_prs must be a JSON array')
  }

  return value.map((item, index) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`stale_prs[${index}] must be an object`)
    }

    const pr = item as Record<string, unknown>
    const number = Number(pr.number)
    const ageDays = Number(pr.ageDays)

    if (!Number.isFinite(number) || !Number.isFinite(ageDays)) {
      throw new Error(`stale_prs[${index}] must include number and ageDays`)
    }

    return {
      number,
      ageDays,
      title: String(pr.title ?? ''),
      author: String(pr.author ?? ''),
      url: String(pr.url ?? ''),
      createdAt: String(pr.createdAt ?? ''),
      updatedAt: pr.updatedAt ? String(pr.updatedAt) : undefined,
      baseRef: pr.baseRef ? String(pr.baseRef) : undefined,
      draft: Boolean(pr.draft)
    }
  })
}

export async function PostPullRequestReminder(): Promise<number | undefined> {
  const webhook =
    core.getInput('webhook') || process.env.FEISHU_BOT_WEBHOOK || ''
  const signKey =
    core.getInput('signkey') || process.env.FEISHU_BOT_SIGNKEY || ''
  const repositoryName =
    core.getInput('repository_name') ||
    core.getInput('service_name') ||
    process.env.GITHUB_REPOSITORY ||
    'repository'
  const thresholdDays = parseNumberInput('threshold_days', 3)
  const maxItems = parseNumberInput('max_items', 50)
  const reportUrl = core.getInput('report_url') || ''

  if (!webhook) {
    core.setFailed('webhook is required')
    return undefined
  }

  let pullRequests: StalePullRequest[]
  try {
    pullRequests = parsePullRequests(core.getInput('stale_prs') || '[]')
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err))
    return undefined
  }

  if (pullRequests.length === 0) {
    console.log('No stale pull requests to notify.')
    return undefined
  }

  const webhookId = webhook.slice(webhook.indexOf('hook/') + 5)
  const tm = Math.floor(Date.now() / 1000)
  const sign = sign_with_timestamp(tm, signKey)

  const cardMsg = BuildPullRequestReminderCard({
    timestamp: tm,
    sign,
    repositoryName,
    thresholdDays,
    pullRequests,
    maxItems,
    reportUrl
  })

  return PostToFeishu(webhookId, cardMsg)
}
