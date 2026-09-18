import template from '../templates/skill-payment-success.v1.json'

export type SkillPaymentCardFields = {
  skillTitle: string
  skillUrl: string
  orderNo: string
  amount: string
  paymentProvider: string
  paidAt: string
  market: string
}

/** Only the Skill name is Markdown, escaped before constructing its link. */
export function BuildSkillPaymentCard(fields: SkillPaymentCardFields): string {
  function field(name: keyof SkillPaymentCardFields, max = 240): string {
    const value = fields[name]
    if (typeof value !== 'string' || !value.trim() || value.length > max) {
      throw new Error(`Invalid Skill payment card field: ${name}`)
    }
    return value
  }
  const url = new URL(field('skillUrl', 2048))
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('Skill link must be a public HTTP(S) URL')
  }
  const title = field('skillTitle')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]~])/g, '\\$1')
    .replace(/[\r\n]+/g, ' ')
  const href = url.href.replace(
    /[()<>]/g,
    char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  const skillLink = `[${title}](${href})`
  return JSON.stringify(template, (_key, value: unknown) => {
    if (typeof value !== 'string') return value
    const slot = /^\{\{(\w+)\}\}$/.exec(value)?.[1]
    if (!slot) return value
    return slot === 'skillLink'
      ? skillLink
      : field(slot as keyof SkillPaymentCardFields)
  })
}
