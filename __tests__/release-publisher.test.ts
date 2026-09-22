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
      user: { login: 'Dogtiti' },
      merged_by: { login: 'reviewer' }
    }
  }
  jest
    .mocked(core.getInput)
    .mockReturnValue(
      JSON.stringify({ dogtiti: { name: '测试用户', open_id: openId } })
    )
})

describe('independent release publisher', () => {
  it('mentions the PR author, not the reviewer/merger or rerun actor', () => {
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
      jest.mocked(core.getInput).mockReturnValue('')
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

  it('does not fall back to the merger or rerun actor when the author is missing', () => {
    if (context.payload.pull_request) delete context.payload.pull_request.user
    expect(resolveReleasePublisher()).toBeUndefined()
  })
})

describe('main push release context', () => {
  function setup(): {
    merge_commit_sha: string
    head: { ref: string; repo: { full_name: string } }
    base: { ref: string; repo: { full_name: string } }
  } {
    const pr = {
      ...context.payload.pull_request,
      head: { ref: 'feat/example', repo: { full_name: 'example/shop' } },
      merge_commit_sha: 'a'.repeat(40),
      base: { ref: 'main', repo: { full_name: 'example/shop' } }
    }
    context.eventName = 'push'
    context.sha = 'a'.repeat(40)
    context.payload.ref = 'refs/heads/main'
    jest
      .mocked(core.getInput)
      .mockImplementation(name =>
        name === 'release_pull_request'
          ? JSON.stringify(pr)
          : JSON.stringify({ Dogtiti: { open_id: openId } })
      )
    return pr
  }
  it('uses the verified merged PR author on push', () => {
    setup()
    expect(resolveReleasePublisher()).toBe(`<at id=${openId}></at>`)
  })
  it('rejects metadata from another merge', () => {
    setup().merge_commit_sha = 'b'.repeat(40)
    expect(() => resolveReleasePublisher()).toThrow('must match this main push')
  })
  it('omits dev bulk releases', () => {
    const pr = setup()
    if (pr.head) pr.head.ref = 'dev'
    expect(resolveReleasePublisher()).toBeUndefined()
  })
  it('ignores provided metadata on recovery', () => {
    setup()
    context.eventName = 'workflow_dispatch'
    expect(resolveReleasePublisher()).toBeUndefined()
  })
})
