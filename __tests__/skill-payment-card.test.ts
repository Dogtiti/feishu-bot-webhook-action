import { BuildSkillPaymentCard } from '../src/skill-payment-card'

const fields = {
  skillTitle: '写作 Skill <at id=all></at> "换行\n内容"',
  skillUrl: 'https://viceme.cn/alice/example',
  orderNo: 'VM202609180000001234567890ab',
  amount: 'CNY 9.90',
  paymentProvider: '微信支付',
  paidAt: '2026/9/18 10:30:00（北京时间）',
  market: 'CN'
}

describe('Skill payment card', () => {
  it('renders one safely escaped Skill link while other fields remain plain text', () => {
    const card = JSON.parse(BuildSkillPaymentCard(fields))
    expect(card.msg_type).toBe('interactive')
    expect(card.card.header.template).toBe('green')
    expect(card.card.config.enable_forward).toBe(false)
    expect(card.card.elements[0].fields[1].text).toEqual({
      tag: 'lark_md',
      content:
        '[写作 Skill &lt;at id=all&gt;&lt;/at&gt; "换行 内容"](https://viceme.cn/alice/example)'
    })
    expect(JSON.stringify(card)).not.toContain('{{')
    expect(JSON.stringify(card).match(/lark_md/g)).toHaveLength(1)
    expect(JSON.stringify(card)).not.toContain('<at')
  })

  it('rejects missing fields and oversized text', () => {
    expect(() => BuildSkillPaymentCard({ ...fields, orderNo: '' })).toThrow(
      'orderNo'
    )
    expect(() =>
      BuildSkillPaymentCard({ ...fields, skillTitle: 'x'.repeat(241) })
    ).toThrow('skillTitle')
  })
})

it('keeps brackets and destination parentheses from breaking the Skill link', () => {
  const card = JSON.parse(
    BuildSkillPaymentCard({
      ...fields,
      skillTitle: 'Skill ] [test]',
      skillUrl: 'https://viceme.cn/alice/skill(test)'
    })
  )
  expect(card.card.elements[0].fields[1].text.content).toBe(
    '[Skill \\] \\[test\\]](https://viceme.cn/alice/skill%28test%29)'
  )
})

it.each([
  'javascript:alert(1)',
  'data:text/html,test',
  'https://user:pass@viceme.cn/alice/example'
])('rejects unsafe link destinations', skillUrl => {
  expect(() => BuildSkillPaymentCard({ ...fields, skillUrl })).toThrow(
    'HTTP(S)'
  )
})
