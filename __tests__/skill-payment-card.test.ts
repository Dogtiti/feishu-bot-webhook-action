import { BuildSkillPaymentCard } from '../src/skill-payment-card'

const fields = {
  skillTitle: '写作 Skill <at id=all></at> "换行\n内容"',
  orderNo: 'VM202609180000001234567890ab',
  amount: 'CNY 9.90',
  paymentProvider: '微信支付',
  paidAt: '2026/9/18 10:30:00（北京时间）',
  market: 'CN'
}

describe('Skill payment card', () => {
  it('renders a green payment card with creator content kept as plain text', () => {
    const card = JSON.parse(BuildSkillPaymentCard(fields))
    expect(card.msg_type).toBe('interactive')
    expect(card.card.header.template).toBe('green')
    expect(card.card.config.enable_forward).toBe(false)
    expect(card.card.elements[0].fields[1].text).toEqual({
      tag: 'plain_text',
      content: fields.skillTitle
    })
    expect(JSON.stringify(card)).not.toContain('{{')
    expect(JSON.stringify(card)).not.toContain('lark_md')
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
