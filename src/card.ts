import { Repository } from './trend'

type CardText = {
  tag: 'plain_text' | 'lark_md'
  content: string
}

type CardElement =
  | {
      tag: 'div'
      text: CardText
    }
  | {
      tag: 'note'
      elements: {
        tag: 'plain_text'
        content: string
      }[]
    }
  | {
      tag: 'action'
      actions: {
        tag: 'button'
        text: {
          tag: 'plain_text'
          content: string
        }
        type: 'primary' | 'default'
        url: string
      }[]
    }
  | {
      tag: 'hr'
    }

type CardV2MarkdownElement = {
  tag: 'markdown'
  element_id: string
  content: string
  text_align: 'left'
  margin: string
}

type CardV2ButtonElement = {
  tag: 'button'
  element_id: string
  text: {
    tag: 'plain_text'
    content: string
  }
  type: 'primary' | 'default'
  width: 'default'
  size: 'medium'
  behaviors: {
    type: 'open_url'
    default_url: string
  }[]
  margin: string
}

type CardV2Element = CardV2MarkdownElement | CardV2ButtonElement

export type GithubNotificationDetails = {
  context?: string
  summaryTitle?: string
  summary?: string
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

type RawCardV2Message = {
  timestamp: string
  sign: string
  msg_type: 'interactive'
  card: {
    schema: '2.0'
    config: {
      enable_forward: boolean
      width_mode: 'fill'
    }
    header: {
      template: string
      padding: string
      title: {
        tag: 'plain_text'
        content: string
      }
    }
    body: {
      direction: 'vertical'
      padding: string
      vertical_spacing: string
      elements: CardV2Element[]
    }
  }
}

function buildBaseCard(
  tm: number,
  sign: string,
  template: string,
  title: string,
  elements: CardElement[]
): string {
  const card: RawCardMessage = {
    timestamp: `${tm}`,
    sign,
    msg_type: 'interactive',
    card: {
      config: {
        wide_screen_mode: true,
        enable_forward: true
      },
      header: {
        template,
        title: {
          tag: 'plain_text',
          content: title
        }
      },
      elements
    }
  }

  return JSON.stringify(card)
}

function buildNotificationCardV2(
  tm: number,
  sign: string,
  template: string,
  title: string,
  elements: CardV2Element[]
): string {
  const card: RawCardV2Message = {
    timestamp: `${tm}`,
    sign,
    msg_type: 'interactive',
    card: {
      schema: '2.0',
      config: {
        enable_forward: true,
        width_mode: 'fill'
      },
      header: {
        template,
        padding: '12px 12px 12px 12px',
        title: {
          tag: 'plain_text',
          content: title
        }
      },
      body: {
        direction: 'vertical',
        padding: '12px 12px 12px 12px',
        vertical_spacing: '8px',
        elements
      }
    }
  }

  return JSON.stringify(card)
}

function buildNotificationElementsV2(
  eventType: string,
  user: string,
  status: string,
  etitle: string,
  detailurl: string,
  details: GithubNotificationDetails
): CardV2Element[] {
  const elements: CardV2Element[] = [
    {
      tag: 'markdown',
      element_id: 'github_title',
      content: `**${escapeInlineMarkdown(etitle)}**`,
      text_align: 'left',
      margin: '0px 0px 0px 0px'
    },
    {
      tag: 'markdown',
      element_id: 'github_meta',
      content: `<font color='grey'>事件：${escapeInlineMarkdown(eventType)} · 操作人：${escapeInlineMarkdown(user)} · 状态：${escapeInlineMarkdown(status)}</font>`,
      text_align: 'left',
      margin: '0px 0px 0px 0px'
    }
  ]

  if (details.context) {
    elements.push({
      tag: 'markdown',
      element_id: 'github_context',
      content: `<font color='grey'>${escapeInlineMarkdown(details.context)}</font>`,
      text_align: 'left',
      margin: '0px 0px 0px 0px'
    })
  }

  if (details.summary) {
    const summaryTitle = details.summaryTitle?.trim()
    const summaryContent = [
      '<hr>',
      summaryTitle ? `**${escapeInlineMarkdown(summaryTitle)}**` : '',
      sanitizeFeishuMarkdown(details.summary)
    ]
      .filter(Boolean)
      .join('\n\n')

    elements.push({
      tag: 'markdown',
      element_id: 'github_summary',
      content: summaryContent,
      text_align: 'left',
      margin: '0px 0px 0px 0px'
    })
  }

  if (detailurl) {
    elements.push({
      tag: 'button',
      element_id: 'github_link',
      text: {
        tag: 'plain_text',
        content: '在 GitHub 查看'
      },
      type: 'primary',
      width: 'default',
      size: 'medium',
      behaviors: [
        {
          type: 'open_url',
          default_url: detailurl
        }
      ],
      margin: '4px 0px 0px 0px'
    })
  }

  return elements
}

function escapeInlineMarkdown(text: string): string {
  return sanitizeFeishuMarkdown(text).replace(/([\\`*_[\]~])/g, '\\$1')
}

function sanitizeFeishuMarkdown(text: string): string {
  return text.replace(
    /<(\/?(?:at|person|raw|text_tag|font|link|number_tag|local_datetime)\b[^>]*)>/gi,
    '&lt;$1&gt;'
  )
}

function buildTrendingMarkdown(repos: Repository[]): string {
  if (repos.length === 0) {
    return '今日暂无 GitHub Trending 数据'
  }

  return repos
    .slice(0, 10)
    .map((repo, index) => {
      const summary = [
        repo.language ? `语言: ${repo.language}` : '',
        `Star: ${repo.stars}`,
        `Fork: ${repo.forks}`,
        `今日新增: ${repo.starsToday}`
      ]
        .filter(Boolean)
        .join(' | ')

      return `${index + 1}. [${repo.author}/${repo.name}](${repo.href})\n${summary}`
    })
    .join('\n\n')
}

export function BuildGithubNotificationCard(
  tm: number,
  sign: string,
  repo: string,
  eventType: string,
  color: string,
  user: string,
  status: string,
  etitle: string,
  detailurl: string,
  details: GithubNotificationDetails = {}
): string {
  return buildNotificationCardV2(
    tm,
    sign,
    color,
    `项目 ${repo} 有新的变化`,
    buildNotificationElementsV2(
      eventType,
      user,
      status,
      etitle,
      detailurl,
      details
    )
  )
}

export function BuildGithubTrendingCard(
  tm: number,
  sign: string,
  repos: Repository[]
): string {
  return buildBaseCard(tm, sign, 'blue', 'GitHub Trending', [
    {
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: buildTrendingMarkdown(repos)
      }
    }
  ])
}
