import * as core from '@actions/core'
import { PostSkillPayment } from '../src/skill-payment'
import { PostToFeishu } from '../src/feishu'

jest.mock('@actions/core')
jest.mock('../src/feishu', () => ({
  PostToFeishu: jest.fn().mockResolvedValue(200),
  sign_with_timestamp: jest.fn().mockReturnValue('test-signature')
}))

const inputs: Record<string, string> = {
  webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/test-only',
  skill_payment: JSON.stringify({
    skillTitle: '付费 Skill',
    orderNo: 'VM123',
    amount: 'CNY 1.00',
    paymentProvider: '微信支付',
    paidAt: '2026-09-18 12:00（北京时间）',
    market: 'CN'
  })
}

beforeEach(() => {
  jest.mocked(core.getInput).mockImplementation(name => inputs[name] || '')
})

it('sends the dedicated card without signature fields when signing is disabled', async () => {
  await expect(PostSkillPayment()).resolves.toBe(200)
  expect(PostToFeishu).toHaveBeenCalledTimes(1)
  const [hookId, body] = jest.mocked(PostToFeishu).mock.calls[0]
  expect(hookId).toBe('test-only')
  expect(JSON.parse(body)).toMatchObject({ msg_type: 'interactive' })
  expect(JSON.parse(body).sign).toBeUndefined()
})

it('adds signing fields when the bot requires them', async () => {
  jest
    .mocked(core.getInput)
    .mockImplementation(name =>
      name === 'signkey' ? 'test-key' : inputs[name] || ''
    )
  await PostSkillPayment()
  expect(JSON.parse(jest.mocked(PostToFeishu).mock.calls[0][1])).toMatchObject({
    sign: 'test-signature'
  })
})

it('rejects missing card fields before sending', async () => {
  jest
    .mocked(core.getInput)
    .mockImplementation(name =>
      name === 'skill_payment' ? '{}' : inputs[name] || ''
    )
  await expect(PostSkillPayment()).rejects.toThrow(
    'Invalid Skill payment card field'
  )
  expect(PostToFeishu).not.toHaveBeenCalled()
})

it('rejects an arbitrary webhook host before sending', async () => {
  jest
    .mocked(core.getInput)
    .mockImplementation(name =>
      name === 'webhook' ? 'https://example.com/hook/test' : inputs[name] || ''
    )
  await expect(PostSkillPayment()).rejects.toThrow('custom bot HTTPS URL')
  expect(PostToFeishu).not.toHaveBeenCalled()
})
