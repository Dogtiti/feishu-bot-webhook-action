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

function buildNotificationElements(
  eventType: string,
  user: string,
  status: string,
  etitle: string,
  detailurl: string
): CardElement[] {
  const elements: CardElement[] = [
    {
      tag: 'note',
      elements: [
        { tag: 'plain_text', content: `事件: ${eventType}` },
        { tag: 'plain_text', content: `操作人: ${user}` },
        { tag: 'plain_text', content: `状态: ${status}` }
      ]
    },
    {
      tag: 'div',
      text: {
        tag: 'plain_text',
        content: etitle
      }
    }
  ]

  if (detailurl) {
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: '查看详情'
          },
          type: 'primary',
          url: detailurl
        }
      ]
    })
  }

  return elements
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
  detailurl: string
): string {
  return buildBaseCard(
    tm,
    sign,
    color,
    `项目 ${repo} 有新的变化`,
    buildNotificationElements(eventType, user, status, etitle, detailurl)
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
