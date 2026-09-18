import * as core from '@actions/core'
import {
  BuildSkillPaymentCard,
  SkillPaymentCardFields
} from './skill-payment-card'
import { PostToFeishu, sign_with_timestamp } from './feishu'

export async function PostSkillPayment(): Promise<number | undefined> {
  const webhook = core.getInput('webhook', { required: true })
  const signKey = core.getInput('signkey')
  const fields: unknown = JSON.parse(
    core.getInput('skill_payment', { required: true })
  )
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw new Error('skill_payment must be a JSON object')
  }
  const url = new URL(webhook)
  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'open.feishu.cn' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^\/open-apis\/bot\/v2\/hook\/[a-zA-Z0-9-]+$/.test(url.pathname)
  ) {
    throw new Error('webhook must be a Feishu custom bot HTTPS URL')
  }
  const card: Record<string, unknown> = JSON.parse(
    BuildSkillPaymentCard(fields as SkillPaymentCardFields)
  )
  if (signKey) {
    const timestamp = Math.floor(Date.now() / 1000)
    card.timestamp = timestamp.toString()
    card.sign = sign_with_timestamp(timestamp, signKey)
  }
  return PostToFeishu(
    url.pathname.slice('/open-apis/bot/v2/hook/'.length),
    JSON.stringify(card)
  )
}
