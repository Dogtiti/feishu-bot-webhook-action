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
        'PR #54 optimize feishu notifications',
        'https://github.com/example/repo/pull/54#issuecomment-1',
        {
          summaryTitle: '评论内容',
          summary: 'keep it short'
        }
      )
    )

    expect(payload.msg_type).toBe('interactive')
    expect(payload.card.header.title.content).toBe(
      '项目 viceme-engine 有新的变化'
    )
    expect(payload.card.schema).toBe('2.0')
    expect(payload.card.body.elements[0].tag).toBe('markdown')
    expect(payload.card.body.elements[0].content).toBe(
      '**PR #54 optimize feishu notifications**'
    )
    expect(payload.card.body.elements[1].content).toContain('操作人：Dogtiti')
    expect(payload.card.body.elements[2]).toEqual(
      expect.objectContaining({
        tag: 'hr',
        element_id: 'github_divider',
        margin: '0px 0px 0px 0px'
      })
    )
    expect(payload.card.body.elements[3].content).toBe(
      '**评论内容**\nkeep it short'
    )
    expect(payload.card.body.elements[4].text.content).toBe('在 GitHub 查看')
    expect(payload.card.body.elements[4].behaviors[0]).toEqual(
      expect.objectContaining({
        type: 'open_url',
        default_url: 'https://github.com/example/repo/pull/54#issuecomment-1'
      })
    )
    expect(JSON.stringify(payload.card.body)).not.toContain('lark_md')
    expect(JSON.stringify(payload)).not.toContain('template_id')
  })

  it('keeps the complete issue comment body', () => {
    const body = 'A'.repeat(200)
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
          body,
          html_url: 'https://github.com/example/repo/pull/54#issuecomment-1'
        }
      },
      'issue_comment'
    )

    expect(notification.eventType).toBe('PR comment')
    expect(notification.etitle).toBe('PR #54 docs: 更新 feishu.yml 工作流')
    expect(notification.summaryTitle).toBe('评论内容')
    expect(notification.summary).toBe(body)
    expect(notification.summary).not.toContain('…')
    expect(notification.detailurl).toBe(
      'https://github.com/example/repo/pull/54#issuecomment-1'
    )
  })

  it('keeps GitHub markdown structure in a longer PR preview', () => {
    const body = [
      '## 变更内容',
      '',
      '- 删除已失效的 `.claude/skills/steel-browser` 链接',
      '- 将开发任务设计文档从根 `docs/` 迁移到 `packages/viceme-sdk/docs/`',
      '- 更新 SDK 代码中的文档路径',
      '- 补充迁移后的维护说明'
    ].join('\n')

    const notification = BuildNotificationContent(
      {
        action: 'opened',
        pull_request: {
          number: 21,
          title: 'chore: clean up migration leftovers',
          body,
          html_url: 'https://github.com/example/repo/pull/21'
        }
      },
      'pull_request'
    )

    expect(notification.summaryTitle).toBe('PR 描述')
    expect(notification.summary).toBe(body)

    const payload = JSON.parse(
      BuildGithubNotificationCard(
        1716283459,
        'signature',
        'viceme-engine',
        notification.eventType,
        'blue',
        'Dogtiti',
        notification.status,
        notification.etitle,
        notification.detailurl,
        {
          summaryTitle: notification.summaryTitle,
          summary: notification.summary
        }
      )
    )
    const summary = payload.card.body.elements.find(
      (element: any) => element.element_id === 'github_summary'
    )
    expect(summary.tag).toBe('markdown')
    expect(summary.content).toContain('## 变更内容')
    expect(summary.content).toContain(
      '- 删除已失效的 `.claude/skills/steel-browser` 链接'
    )
  })

  it('neutralizes Feishu mention tags in GitHub-authored markdown', () => {
    const payload = JSON.parse(
      BuildGithubNotificationCard(
        1716283459,
        'signature',
        'viceme-engine',
        'PR opened',
        'blue',
        'Dogtiti',
        'opened',
        'PR #21 safe preview <at id=all></at>',
        'https://github.com/example/repo/pull/21',
        {
          summaryTitle: 'PR 描述',
          summary: 'normal text\n<at id=all></at>'
        }
      )
    )

    const summary = payload.card.body.elements.find(
      (element: any) => element.element_id === 'github_summary'
    )
    const title = payload.card.body.elements.find(
      (element: any) => element.element_id === 'github_title'
    )
    expect(title.content).not.toContain('<at id=all>')
    expect(title.content).toContain('&lt;at id=all&gt;')
    expect(summary.content).not.toContain('<at id=all>')
    expect(summary.content).toContain('&lt;at id=all&gt;')
  })
})
