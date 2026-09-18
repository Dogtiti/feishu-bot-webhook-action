import template from '../templates/skill-payment-success.v1.json'

export type SkillPaymentCardFields = {
  skillTitle: string
  orderNo: string
  amount: string
  paymentProvider: string
  paidAt: string
  market: string
}

/** All dynamic fields are plain_text, including titles supplied by creators. */
export function BuildSkillPaymentCard(fields: SkillPaymentCardFields): string {
  return JSON.stringify(template, (_key, value: unknown) => {
    if (typeof value !== 'string') return value
    const slot = /^\{\{(\w+)\}\}$/.exec(value)?.[1]
    if (!slot) return value
    const replacement = fields[slot as keyof SkillPaymentCardFields]
    if (
      typeof replacement !== 'string' ||
      !replacement.trim() ||
      replacement.length > 240
    ) {
      throw new Error(`Invalid Skill payment card field: ${slot}`)
    }
    return replacement
  })
}
