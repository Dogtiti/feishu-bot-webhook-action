import { BuildReleaseChangelogCard } from '../src/release-card'

describe('release changelog card', () => {
  it('builds a release card with all fields', () => {
    const card = JSON.parse(
      BuildReleaseChangelogCard({
        timestamp: 1716283459,
        sign: 'test-sign',
        serviceName: 'viceme-engine',
        tagName: 'v0.0.3',
        changelog:
          '新功能\n- 支持文件上传\n\n问题修复\n- 修复了消息发送失败的问题',
        compareUrl:
          'https://github.com/Leizhenpeng/viceme-engine/compare/v0.0.2...main',
        commitCount: 15,
        actor: 'Dogtiti'
      })
    )

    expect(card.msg_type).toBe('interactive')
    expect(card.card.header.template).toBe('green')
    expect(card.card.header.title.content).toContain('viceme-engine')
    expect(card.card.header.title.content).toContain('已发布新版本')

    const noteEl = card.card.elements[0]
    expect(noteEl.tag).toBe('note')
    expect(noteEl.elements[0].content).toBe('服务: viceme-engine')
    expect(noteEl.elements[1].content).toBe('版本: v0.0.3')
    expect(noteEl.elements[2].content).toBe('提交数: 15')
    expect(noteEl.elements[3].content).toBe('操作人: Dogtiti')

    const divEl = card.card.elements.find(
      (e: any) => e.tag === 'div' && e.text?.content?.includes('新功能')
    )
    expect(divEl).toBeDefined()
    expect(divEl.text.content).toContain('支持文件上传')

    const actionEl = card.card.elements.find((e: any) => e.tag === 'action')
    expect(actionEl).toBeDefined()
    expect(actionEl.actions[0].url).toBe(
      'https://github.com/Leizhenpeng/viceme-engine/compare/v0.0.2...main'
    )
  })

  it('omits compare button when compareUrl is empty', () => {
    const card = JSON.parse(
      BuildReleaseChangelogCard({
        timestamp: 1716283459,
        sign: 'test-sign',
        serviceName: 'viceme-api',
        tagName: 'v0.1.0',
        changelog: '本次更新为内部技术优化，无面向用户的功能变化',
        compareUrl: '',
        commitCount: 3,
        actor: 'mayfwl'
      })
    )

    const actionEl = card.card.elements.find((e: any) => e.tag === 'action')
    expect(actionEl).toBeUndefined()
  })
})
