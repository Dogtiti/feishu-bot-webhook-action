import * as core from '@actions/core'
import { PostGithubEvent } from './github2feishu'
import { PostReleaseChangelog } from './release-changelog'
import { PostPullRequestReminder } from './pr-reminder'

async function run(): Promise<void> {
  const mode = core.getInput('mode') || 'event'

  if (mode === 'release-changelog') {
    await PostReleaseChangelog()
  } else if (mode === 'pr-reminder' || mode === 'stale-pr-reminder') {
    await PostPullRequestReminder()
  } else {
    await PostGithubEvent()
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
