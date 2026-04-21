import { BuildGithubNotificationCard } from '../src/card'
import { BuildNotificationContent } from '../src/github2feishu'

describe('notification card', () => {
  it('builds a raw interactive card without template ids', () => {
    const payload = JSON.parse(
      BuildGithubNotificationCard(
        1716283459,
        'signature',
        'viceme-engine',
        'PR comment',
        'blue',
        'Dogtiti',
        'created',
        'PR #54 optimize feishu notifications\n\n评论摘要: keep it short',
        'https://github.com/example/repo/pull/54#issuecomment-1'
      )
    )

    expect(payload.msg_type).toBe('interactive')
    expect(payload.card.header.title.content).toBe('项目 viceme-engine 有新的变化')
    expect(payload.card.elements[0].tag).toBe('note')
    expect(payload.card.elements[0].elements[1].content).toBe('操作人: Dogtiti')
    expect(JSON.stringify(payload)).not.toContain('template_id')
  })

  it('summarizes issue comments instead of forwarding the full body', () => {
    const notification = BuildNotificationContent(
      {
        action: 'created',
        issue: {
          number: 54,
          title: 'docs: 更新 feishu.yml 工作流',
          html_url: 'https://github.com/example/repo/pull/54',
          pull_request: {}
        },
        comment: {
          body: 'A'.repeat(200),
          html_url: 'https://github.com/example/repo/pull/54#issuecomment-1'
        }
      },
      'issue_comment',
      40
    )

    expect(notification.eventType).toBe('PR comment')
    expect(notification.etitle).toContain('PR #54 docs: 更新 feishu.yml 工作流')
    expect(notification.etitle).toContain('评论摘要: ')
    expect(notification.etitle).toContain('…')
    expect(notification.detailurl).toBe(
      'https://github.com/example/repo/pull/54#issuecomment-1'
    )
  })
})
