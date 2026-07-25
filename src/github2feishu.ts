import * as core from '@actions/core'
import { context } from '@actions/github'
import getTrending from './trend'
import { sign_with_timestamp, PostToFeishu } from './feishu'
import { BuildGithubTrendingCard, BuildGithubNotificationCard } from './card'

type NotificationContent = {
  eventType: string
  status: string
  etitle: string
  context: string
  summaryTitle: string
  summary: string
  detailurl: string
}

function normalizeText(text: string | undefined): string {
  return (text || '').replace(/\r\n?/g, '\n').trim()
}

function buildSubject(
  kind: 'PR' | 'Issue',
  number: number | undefined,
  title: string | undefined
): string {
  return `${kind} #${number || 0} ${title || ''}`.trim()
}

function formatReviewLocation(
  path: string | undefined,
  line: number | undefined,
  startLine: number | undefined
): string {
  if (!path) {
    return ''
  }

  const lineNumber = line || startLine
  return lineNumber ? `${path}:${lineNumber}` : path
}

export function BuildNotificationContent(
  payload: Record<string, any>,
  eventName: string
): NotificationContent {
  const repoUrl = payload.repository?.html_url || ''
  let eventType = eventName
  let status = payload.action || 'closed'
  let etitle = payload.issue?.html_url || payload.pull_request?.html_url || ''
  let contextText = ''
  let summaryTitle = ''
  let summary = ''
  let detailurl = ''

  switch (eventName) {
    case 'branch_protection_rule': {
      const rule = payload.rule
      eventType = 'Protection rule'
      etitle = rule.name
      summaryTitle = '规则详情'
      summary = normalizeText(JSON.stringify(rule, null, 2))
      status = payload.action || 'created'
      detailurl = repoUrl
      break
    }
    case 'create':
      eventType = 'Create ref'
      etitle = `${payload['ref_type'] === 'tag' ? 'Tag' : 'Ref'}: ${payload['ref']}`
      status = 'created'
      detailurl = repoUrl
      break
    case 'delete':
      eventType = 'Delete ref'
      etitle = `${payload['ref_type'] === 'tag' ? 'Tag' : 'Ref'}: ${payload['ref']}`
      status = 'deleted'
      detailurl = repoUrl
      break
    case 'issue_comment': {
      const issue = payload.issue
      const comment = payload.comment
      const isPrComment = Boolean(issue?.pull_request)

      eventType = isPrComment ? 'PR comment' : 'Issue comment'
      etitle = buildSubject(
        isPrComment ? 'PR' : 'Issue',
        issue?.number,
        issue?.title
      )
      summaryTitle = '评论内容'
      summary = normalizeText(comment?.body)
      detailurl = comment?.html_url || issue?.html_url || ''
      break
    }
    case 'issues': {
      const issue = payload.issue
      eventType = 'Issue'
      etitle = buildSubject('Issue', issue?.number, issue?.title)
      summaryTitle = 'Issue 内容'
      summary = normalizeText(issue?.body)
      detailurl = issue?.html_url || ''
      break
    }
    case 'pull_request': {
      const pr = payload.pull_request
      eventType = 'PR opened'
      status = payload.action || pr?.state || 'opened'
      etitle = buildSubject('PR', pr?.number, pr?.title)
      summaryTitle = 'PR 描述'
      summary = normalizeText(pr?.body)
      detailurl = pr?.html_url || ''
      break
    }
    case 'pull_request_review': {
      const pr = payload.pull_request
      const review = payload.review
      eventType = 'PR review'
      status = review?.state || payload.action || 'submitted'
      etitle = buildSubject('PR', pr?.number, pr?.title)
      summaryTitle = 'Review 内容'
      summary = normalizeText(review?.body)
      detailurl = review?.html_url || pr?.html_url || ''
      break
    }
    case 'pull_request_review_comment': {
      const pr = payload.pull_request
      const comment = payload.comment
      eventType = 'Review comment'
      status = payload.action || 'created'
      etitle = buildSubject('PR', pr?.number, pr?.title)

      const location = formatReviewLocation(
        comment?.path,
        comment?.line,
        comment?.start_line
      )
      if (location) {
        contextText = `代码位置：${location}`
      }

      summaryTitle = '评论内容'
      summary = normalizeText(comment?.body)
      detailurl = comment?.html_url || pr?.html_url || ''
      break
    }
    case 'push': {
      const headCommit = payload['head_commit']
      const refText =
        payload['ref'].indexOf('refs/tags/') !== -1
          ? `Tag: ${payload['ref'].slice(payload['ref'].indexOf('refs/tags/') + 10)}`
          : payload['ref'].indexOf('refs/heads/') !== -1
            ? `Branch: ${payload['ref'].slice(
                payload['ref'].indexOf('refs/heads/') + 11
              )}`
            : ''
      eventType = 'Push'
      etitle = refText
      summaryTitle = '提交信息'
      summary = normalizeText(headCommit?.message)
      status =
        payload['created'] === true
          ? 'created'
          : payload['forced'] === true
            ? 'force updated'
            : 'updated'
      detailurl = payload['compare'] || ''
      break
    }
    case 'release': {
      const release = payload.release
      eventType = 'Release'
      etitle = `${release['name'] || release['tag_name'] || 'Release'}`
      summaryTitle = '发布说明'
      summary = normalizeText(release['body'])
      status = payload.action || 'published'
      detailurl = release['html_url'] || ''
      break
    }
    case 'watch':
      eventType = 'Star'
      etitle = `Total stars: ${payload.repository?.['stargazers_count']}`
      status = 'starred'
      detailurl = repoUrl
      break
    default:
      break
  }

  return {
    eventType,
    status,
    etitle,
    context: contextText,
    summaryTitle,
    summary,
    detailurl: detailurl || repoUrl
  }
}

async function PostGithubTrending(
  webhookId: string,
  timestamp: number,
  sign: string
): Promise<number | undefined> {
  const trend = await getTrending()
  const cardmsg = BuildGithubTrendingCard(timestamp, sign, trend)
  return PostToFeishu(webhookId, cardmsg)
}

export async function PostGithubEvent(): Promise<number | undefined> {
  const webhook = core.getInput('webhook')
    ? core.getInput('webhook')
    : process.env.FEISHU_BOT_WEBHOOK || ''
  const signKey = core.getInput('signkey')
    ? core.getInput('signkey')
    : process.env.FEISHU_BOT_SIGNKEY || ''

  const payload = context.payload || {}
  console.log(payload)

  const webhookId = webhook.slice(webhook.indexOf('hook/') + 5)
  const tm = Math.floor(Date.now() / 1000)
  const sign = sign_with_timestamp(tm, signKey)

  const actor =
    payload.sender?.login ||
    payload.comment?.user?.login ||
    payload.review?.user?.login ||
    context.actor
  const repo = payload.repository?.name || 'junka'
  const eventName = context.eventName

  if (eventName === 'schedule') {
    return PostGithubTrending(webhookId, tm, sign)
  }

  const notification = BuildNotificationContent(payload, eventName)
  const cardmsg = BuildGithubNotificationCard(
    tm,
    sign,
    repo,
    notification.eventType,
    'blue',
    actor,
    notification.status,
    notification.etitle,
    notification.detailurl,
    {
      context: notification.context,
      summaryTitle: notification.summaryTitle,
      summary: notification.summary
    }
  )

  return PostToFeishu(webhookId, cardmsg)
}
