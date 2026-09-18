import * as core from '@actions/core'
import { PostReleaseChangelog } from '../src/release-changelog'

jest.mock('@actions/core')
jest.mock('../src/release-changelog')
jest.mock('../src/github2feishu')
jest.mock('../src/pr-reminder')

it('marks the Action failed when Feishu rejects the release notification', async () => {
  jest.mocked(core.getInput).mockReturnValue('release-changelog')
  jest
    .mocked(PostReleaseChangelog)
    .mockRejectedValue(new Error('Feishu rejected the message (code 11246)'))
  await import('../src/index')
  await new Promise(resolve => setImmediate(resolve))
  expect(core.setFailed).toHaveBeenCalledWith(
    'Feishu rejected the message (code 11246)'
  )
})
