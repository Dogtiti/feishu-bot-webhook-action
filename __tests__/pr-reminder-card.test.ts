import { BuildPullRequestReminderCard } from '../src/pr-reminder-card'

describe('pull request reminder card', () => {
  it('builds a stale pull request reminder card', () => {
    const card = JSON.parse(
      BuildPullRequestReminderCard({
        timestamp: 1716283459,
        sign: 'test-sign',
        repositoryName: 'Viceme-Web',
        thresholdDays: 3,
        maxItems: 20,
        reportUrl: 'https://github.com/Leizhenpeng/Viceme-Web/actions/runs/1',
        pullRequests: [
          {
            number: 1042,
            title: 'feat: add SDK codegen drift check',
            author: 'Dogtiti',
            url: 'https://github.com/Leizhenpeng/Viceme-Web/pull/1042',
            createdAt: '2026-06-18T10:00:00Z',
            ageDays: 4,
            baseRef: 'dev'
          }
        ]
      })
    )

    expect(card.msg_type).toBe('interactive')
    expect(card.card.header.template).toBe('orange')
    expect(card.card.header.title.content).toContain('Viceme-Web')
    expect(card.card.header.title.content).toContain('1 个 PR')

    const summary = card.card.elements[0]
    expect(summary.tag).toBe('column_set')

    const prList = card.card.elements.find(
      (e: any) => e.tag === 'div' && e.text?.content?.includes('#1042')
    )
    expect(prList).toBeDefined()
    expect(prList.text.content).toContain('4 天')
    expect(prList.text.content).toContain('作者: Dogtiti')
    expect(prList.text.content).toContain('→ dev')

    const actionEl = card.card.elements.find((e: any) => e.tag === 'action')
    expect(actionEl).toBeDefined()
    expect(actionEl.actions[0].url).toBe(
      'https://github.com/Leizhenpeng/Viceme-Web/actions/runs/1'
    )
  })

  it('limits displayed pull requests', () => {
    const pullRequests = Array.from({ length: 3 }, (_, index) => ({
      number: index + 1,
      title: `PR ${index + 1}`,
      author: 'Dogtiti',
      url: `https://github.com/example/repo/pull/${index + 1}`,
      createdAt: '2026-06-18T10:00:00Z',
      ageDays: index + 3
    }))

    const card = JSON.parse(
      BuildPullRequestReminderCard({
        timestamp: 1716283459,
        sign: 'test-sign',
        repositoryName: 'viceme-api',
        thresholdDays: 3,
        maxItems: 2,
        pullRequests
      })
    )

    const prList = card.card.elements.find(
      (e: any) => e.tag === 'div' && e.text?.content?.includes('#1')
    )
    expect(prList.text.content).toContain('#1')
    expect(prList.text.content).toContain('#2')
    expect(prList.text.content).not.toContain('#3')
    expect(prList.text.content).toContain('还有 1 个 PR 未展示')
  })
})
