import * as core from '@actions/core'
import { context } from '@actions/github'
import { PostReleaseChangelog } from '../src/release-changelog'
import { generateChangelog } from '../src/changelog'
import { PostToFeishu } from '../src/feishu'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: { eventName: 'pull_request', payload: {}, actor: 'rerun-operator' }
}))
jest.mock('../src/changelog')
jest.mock('../src/feishu', () => ({
  sign_with_timestamp: jest.fn(() => 'test-sign'),
  PostToFeishu: jest.fn(async () => 200)
}))

it.each(['feat/example', 'dev'])(
  'passes real PR context and mapping to the outgoing %s card without network calls',
  async source => {
    const id = 'ou_0123456789abcdef0123456789abcdef'
    const inputs: Record<string, string> = {
      webhook: 'https://open.feishu.cn/open-apis/bot/v2/hook/test-only',
      ai_api_key: 'test-only',
      commits: 'abc123 feat: example',
      service_name: 'shop',
      tag_name: 'v1.0.1',
      commit_count: '1',
      compare_url: 'https://github.com/example/shop/compare/v1.0.0...v1.0.1',
      github_feishu_users: JSON.stringify({ Dogtiti: { open_id: id } })
    }
    jest.mocked(core.getInput).mockImplementation(key => inputs[key] ?? '')
    jest.mocked(generateChangelog).mockResolvedValue('新功能：示例')
    context.payload = {
      action: 'closed',
      repository: {
        name: 'shop',
        owner: { login: 'example' },
        full_name: 'example/shop'
      },
      pull_request: {
        number: 1,
        merged: true,
        base: { ref: 'main' },
        head: { ref: source, repo: { full_name: 'example/shop' } },
        user: { login: 'Dogtiti' },
        merged_by: { login: 'reviewer' }
      }
    }
    expect(await PostReleaseChangelog()).toBe(200)
    const card = jest.mocked(PostToFeishu).mock.calls[0][1]
    expect(card.includes(`<at id=${id}></at>`)).toBe(source !== 'dev')
    expect(card.includes('单独发布')).toBe(source !== 'dev')
    expect(card).toContain('查看完整变更')
  }
)
