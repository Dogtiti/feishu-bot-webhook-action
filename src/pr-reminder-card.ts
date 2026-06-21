type CardElement =
  | {
      tag: 'div'
      text: {
        tag: 'plain_text' | 'lark_md'
        content: string
      }
    }
  | {
      tag: 'column_set'
      flex_mode: 'none' | 'stretch' | 'bisect' | 'trisect'
      background_style: 'default' | 'grey'
      columns: Array<{
        tag: 'column'
        width: 'weighted'
        weight: number
        vertical_align: 'top'
        elements: Array<{
          tag: 'div'
          text: {
            tag: 'lark_md'
            content: string
          }
        }>
      }>
    }
  | { tag: 'hr' }
  | {
      tag: 'note'
      elements: Array<{
        tag: 'plain_text'
        content: string
      }>
    }
  | {
      tag: 'action'
      actions: Array<{
        tag: 'button'
        text: {
          tag: 'plain_text'
          content: string
        }
        type: 'primary' | 'default'
        url: string
      }>
    }

type RawCardMessage = {
  timestamp: string
  sign: string
  msg_type: 'interactive'
  card: {
    config: {
      wide_screen_mode: boolean
      enable_forward: boolean
    }
    header: {
      template: string
      title: {
        tag: 'plain_text'
        content: string
      }
    }
    elements: CardElement[]
  }
}

export type StalePullRequest = {
  number: number
  title: string
  author: string
  url: string
  createdAt: string
  ageDays: number
  baseRef?: string
  updatedAt?: string
  draft?: boolean
}

export type PullRequestReminderCardParams = {
  timestamp: number
  sign: string
  repositoryName: string
  thresholdDays: number
  pullRequests: StalePullRequest[]
  maxItems: number
  reportUrl?: string
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function getAuthor(pr: StalePullRequest): string {
  return oneLine(pr.author) || 'unknown'
}

function countAuthors(pullRequests: StalePullRequest[]): number {
  return new Set(pullRequests.map(getAuthor)).size
}

function groupByAuthor(
  pullRequests: StalePullRequest[]
): Array<{ author: string; pullRequests: StalePullRequest[] }> {
  const groups = new Map<string, StalePullRequest[]>()

  for (const pr of pullRequests) {
    const author = getAuthor(pr)
    groups.set(author, [...(groups.get(author) || []), pr])
  }

  return [...groups.entries()]
    .map(([author, prs]) => ({ author, pullRequests: prs }))
    .sort((left, right) => {
      const countDiff = right.pullRequests.length - left.pullRequests.length
      if (countDiff !== 0) {
        return countDiff
      }

      const ageDiff =
        right.pullRequests[0].ageDays - left.pullRequests[0].ageDays
      if (ageDiff !== 0) {
        return ageDiff
      }

      return left.author.localeCompare(right.author)
    })
}

function formatPullRequestLine(pr: StalePullRequest): string {
  const base = pr.baseRef ? ` · 合入: ${oneLine(pr.baseRef)}` : ''
  const draft = pr.draft ? ' · Draft' : ''
  return `- ${pr.ageDays} 天 · [#${pr.number} ${oneLine(pr.title)}](${pr.url})${base}${draft}`
}

function formatPullRequests(
  pullRequests: StalePullRequest[],
  maxItems: number
): string {
  const visible = pullRequests.slice(0, maxItems)
  const lines = groupByAuthor(visible).map(group =>
    [
      `**@${group.author}** · ${group.pullRequests.length} 个 PR`,
      ...group.pullRequests.map(formatPullRequestLine)
    ].join('\n')
  )

  const hidden = pullRequests.length - visible.length
  if (hidden > 0) {
    lines.push(`还有 ${hidden} 个 PR 未展示, 请打开 GitHub 查看完整列表。`)
  }

  return lines.join('\n\n')
}

export function BuildPullRequestReminderCard(
  params: PullRequestReminderCardParams
): string {
  const {
    timestamp,
    sign,
    repositoryName,
    thresholdDays,
    pullRequests,
    maxItems,
    reportUrl
  } = params

  const elements: CardElement[] = [
    {
      tag: 'column_set',
      flex_mode: 'bisect',
      background_style: 'grey',
      columns: [
        {
          tag: 'column',
          width: 'weighted',
          weight: 1,
          vertical_align: 'top',
          elements: [
            {
              tag: 'div',
              text: { tag: 'lark_md', content: `**仓库**\n${repositoryName}` }
            }
          ]
        },
        {
          tag: 'column',
          width: 'weighted',
          weight: 1,
          vertical_align: 'top',
          elements: [
            {
              tag: 'div',
              text: { tag: 'lark_md', content: `**阈值**\n${thresholdDays} 天` }
            }
          ]
        },
        {
          tag: 'column',
          width: 'weighted',
          weight: 1,
          vertical_align: 'top',
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: `**待处理**\n${pullRequests.length} 个 PR / ${countAuthors(pullRequests)} 人`
              }
            }
          ]
        }
      ]
    },
    { tag: 'hr' },
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: formatPullRequests(pullRequests, maxItems)
      }
    }
  ]

  if (reportUrl) {
    elements.push({ tag: 'hr' })
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '查看本次检查' },
          type: 'primary',
          url: reportUrl
        }
      ]
    })
  }

  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: '由 GitHub Actions 定时检查 open PR 生成'
      }
    ]
  })

  const card: RawCardMessage = {
    timestamp: `${timestamp}`,
    sign,
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true,
        enable_forward: true
      },
      header: {
        template: 'orange',
        title: {
          tag: 'plain_text',
          content: `${repositoryName} 有 ${pullRequests.length} 个 PR 已超过 ${thresholdDays} 天未合并`
        }
      },
      elements
    }
  }

  return JSON.stringify(card)
}
