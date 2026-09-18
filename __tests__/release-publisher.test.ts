import * as core from '@actions/core'
import { context } from '@actions/github'
import { resolveReleasePublisher } from '../src/release-publisher'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: { eventName: 'pull_request', payload: {}, actor: 'rerun-operator' }
}))

const openId = 'ou_0123456789abcdef0123456789abcdef'

beforeEach(() => {
  context.eventName = 'pull_request'
  context.payload = {
    action: 'closed',
    repository: {
      full_name: 'example/shop',
      name: 'shop',
      owner: { login: 'example' }
    },
    pull_request: {
      number: 1,
      merged: true,
      base: { ref: 'main' },
      head: { ref: 'feat/example', repo: { full_name: 'example/shop' } },
      user: { login: 'author' },
      merged_by: { login: 'Dogtiti' }
    }
  }
  jest
    .mocked(core.getInput)
    .mockReturnValue(
      JSON.stringify({ dogtiti: { name: '测试用户', open_id: openId } })
    )
})

describe('independent release publisher', () => {
  it('mentions the actual merger, not the author or rerun actor', () => {
    expect(resolveReleasePublisher()).toBe(`<at id=${openId}></at>`)
    expect(core.getInput).toHaveBeenCalledWith('github_feishu_users')
  })

  it.each([
    [
      'bulk dev release',
      { head: { ref: 'dev', repo: { full_name: 'example/shop' } } }
    ],
    ['unmerged PR', { merged: false }],
    ['dev target', { base: { ref: 'dev' } }],
    [
      'fork PR',
      { head: { ref: 'feat/example', repo: { full_name: 'fork/shop' } } }
    ],
    ['missing source branch', { head: {} }]
  ])('omits the publisher for %s', (_name, change) => {
    Object.assign(context.payload.pull_request ?? {}, change)
    jest.mocked(core.getInput).mockReturnValue('invalid JSON is never read')
    expect(resolveReleasePublisher()).toBeUndefined()
  })

  it.each(['push', 'release', 'workflow_dispatch'])(
    'omits non-PR event %s',
    event => {
      context.eventName = event
      expect(resolveReleasePublisher()).toBeUndefined()
    }
  )

  it('omits opened PRs', () => {
    context.payload.action = 'opened'
    expect(resolveReleasePublisher()).toBeUndefined()
  })

  it('does not fabricate a mention for an unmapped login', () => {
    jest.mocked(core.getInput).mockReturnValue('{}')
    expect(resolveReleasePublisher()).toBe(
      '[@Dogtiti](https://github.com/Dogtiti)'
    )
    expect(core.warning).toHaveBeenCalled()
  })

  it.each(['bad json', '[]', 'null', '"text"'])(
    'rejects invalid mapping %s',
    raw => {
      jest.mocked(core.getInput).mockReturnValue(raw)
      expect(() => resolveReleasePublisher()).toThrow('JSON object')
    }
  )

  it.each(['all', 'ou_bad', 'ou_x></at><at id=all>'])(
    'rejects unsafe ID %s',
    id => {
      jest
        .mocked(core.getInput)
        .mockReturnValue(JSON.stringify({ Dogtiti: { open_id: id } }))
      expect(() => resolveReleasePublisher()).toThrow('Invalid Feishu open_id')
    }
  )

  it('rejects ambiguous case-insensitive mappings', () => {
    jest.mocked(core.getInput).mockReturnValue(
      JSON.stringify({
        Dogtiti: { open_id: openId },
        dogtiti: { open_id: openId }
      })
    )
    expect(() => resolveReleasePublisher()).toThrow('duplicate GitHub logins')
  })

  it('does not fall back to the rerun actor when merged_by is missing', () => {
    if (context.payload.pull_request)
      delete context.payload.pull_request.merged_by
    expect(resolveReleasePublisher()).toBeUndefined()
  })
})
