import * as core from '@actions/core'
import { context } from '@actions/github'

// Only a merged, same-repository feature PR into main is an independent release.
// Do not infer this from a tag, actor, commit message, or a workflow rerun.
export function resolveReleasePublisher(): string | undefined {
  const pr = context.payload.pull_request
  if (
    context.eventName !== 'pull_request' ||
    context.payload.action !== 'closed' ||
    pr?.merged !== true ||
    pr.base?.ref !== 'main' ||
    typeof pr.head?.ref !== 'string' ||
    !pr.head.ref ||
    pr.head.ref.toLowerCase() === 'dev' ||
    !pr.head.repo?.full_name ||
    pr.head.repo.full_name !== context.payload.repository?.full_name
  ) {
    return undefined
  }

  // merged_by is stable across reruns; context.actor may be a workflow operator.
  const login: unknown = pr.merged_by?.login
  if (
    typeof login !== 'string' ||
    !/^[a-z0-9][a-z0-9-]*(?:\[bot\])?$/i.test(login)
  ) {
    core.warning(
      'Independent release has no valid merged_by login; publisher omitted'
    )
    return undefined
  }

  const raw = core.getInput('github_feishu_users')
  let users: unknown
  try {
    users = raw ? JSON.parse(raw) : {}
  } catch {
    throw new Error('github_feishu_users must be a JSON object')
  }
  if (users === null || typeof users !== 'object' || Array.isArray(users)) {
    throw new Error('github_feishu_users must be a JSON object')
  }
  const matches = Object.entries(users).filter(
    ([githubLogin]) => githubLogin.toLowerCase() === login.toLowerCase()
  )
  if (matches.length > 1) {
    throw new Error('github_feishu_users contains duplicate GitHub logins')
  }
  const user = matches[0]?.[1] as { open_id?: unknown } | undefined
  if (!user) {
    core.warning(`No Feishu user mapping for release publisher ${login}`)
    return `[@${login}](https://github.com/${login})`
  }
  if (
    typeof user.open_id !== 'string' ||
    !/^ou_[a-f0-9]{32}$/.test(user.open_id)
  ) {
    throw new Error(`Invalid Feishu open_id for release publisher ${login}`)
  }
  return `<at id=${user.open_id}></at>`
}
