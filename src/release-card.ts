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

export type ReleaseCardParams = {
  timestamp: number
  sign: string
  serviceName: string
  tagName: string
  changelog: string
  compareUrl: string
  commitCount: number
  actor: string
}

export function BuildReleaseChangelogCard(params: ReleaseCardParams): string {
  const { timestamp, sign, serviceName, tagName, changelog, compareUrl, commitCount } =
    params

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
              text: { tag: 'lark_md', content: `**服务**\n${serviceName}` }
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
              text: { tag: 'lark_md', content: `**版本**\n${tagName}` }
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
              text: { tag: 'lark_md', content: `**提交数**\n${commitCount}` }
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
        content: changelog
      }
    }
  ]

  if (compareUrl) {
    elements.push({ tag: 'hr' })
    elements.push({
      tag: 'action',
      actions: [
        {
          tag: 'button',
          text: { tag: 'plain_text', content: '查看完整变更' },
          type: 'primary',
          url: compareUrl
        }
      ]
    })
  }

  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: '由 AI 自动生成 · 基于 Git commit 记录总结'
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
        template: 'green',
        title: {
          tag: 'plain_text',
          content: `🚀 ${serviceName} ${tagName} 已发布`
        }
      },
      elements
    }
  }

  return JSON.stringify(card)
}
