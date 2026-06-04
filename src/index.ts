import * as core from '@actions/core'
import { PostGithubEvent } from './github2feishu'
import { PostReleaseChangelog } from './release-changelog'

async function run(): Promise<void> {
  const mode = core.getInput('mode') || 'event'

  if (mode === 'release-changelog') {
    await PostReleaseChangelog()
  } else {
    await PostGithubEvent()
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
