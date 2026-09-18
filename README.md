## feishu-bot-webhook-action

![CI](https://github.com/junka/feishu-bot-webhook-action/actions/workflows/ci.yml/badge.svg)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

- What is this for? Send Github events to Feishu Bot, but in the format that
  Feishu recognises.

- 作何用途？利用github action发送事件消息到飞书自定义机器人/机器人

#### Add custom bot to a group in your Feishu app.

#### 添加一个自定义机器人到你的飞书群

In the bot setting, copy the webhook url and configure it to the action secrets
as `FEISHU_BOT_WEBHOOK`.

在自定义机器人设置界面，拷贝webhook url并配置到github仓库的action secrets中，命
名为`FEISHU_BOT_WEBHOOK`

If you enable the signature verify in the bot setting, copy the signkey to
secrets too, name it as `FEISHU_BOT_SIGNKEY`

如果你启用了签名校验，那么请将签名密钥也拷贝到secrets中，命名
为`FEISHU_BOT_SIGNKEY`

#### Add action workflow

#### 添加一个action workfow

custom the events you care

自定义你所关心的事件

```yaml
name: feishu bot

on:
  branch_protection_rule:
    types: [created, deleted]
  check_run:
    types: [rerequested, completed]
  check_suite:
    types: [completed]
  create:
  delete:
  deployment_status:
  discussion:
    types: [created, edited, answered]
  discussion_comment:
    types: [created, deleted]
  fork:
  gollum:
  issues:
    types: [opened, edited, milestoned, pinned, reopened]
  issue_comment:
    types: [created, deleted]
  label:
    types: [created, deleted]
  merge_group:
    types: [checks_requested]
  milestone:
    types: [opened, deleted]
  page_build:
  project:
    types: [created, deleted, reopened]
  project_card:
    types: [created, deleted]
  project_column:
    types: [created, deleted]
  public:
  pull_request:
    branches: ['main']
    types: [opened, reopened]
  pull_request_review:
    types: [edited, dismissed, submitted]
  pull_request_review_comment:
    types: [created, edited, deleted]
  pull_request_target:
    types: [assigned, opened, synchronize, reopened]
  push:
    branches: ['main']
  registry_package:
    types: [published]
  release:
    types: [published]
  status:
  watch:
    types: [started]
  schedule:
    - cron: '30 2 * * *'

jobs:
  send-event:
    name: Webhook
    runs-on: ubuntu-latest
    steps:
      - uses: junka/feishu-bot-webhook-action@main
        with:
          webhook: ${{ secrets.FEISHU_BOT_WEBHOOK }}
          signkey: ${{ secrets.FEISHU_BOT_SIGNKEY }}
```

#### Action Input

As you can see that in the example workflow yaml file, you need the following
input variables.

如上面例子展示的工作流的yaml文件所示，你需要关注以下输入变量。

- `webhook`: required, the webhook url for the custom bot. 必需，自定义机器人的
  回调webhook
- `signkey`: optional, the sign key for the bot when you enable the signature
  verification. 可选，自定义机器人的签名密钥，当启用签名校验时需要
- `comment_max_length`: deprecated compatibility input. GitHub bodies, comments,
  and reviews are now shown in full. 兼容旧工作流保留，GitHub 正文、评论和
  Review 现在会完整展示。
- `mode`: optional, action mode. Use `event` for GitHub event notifications,
  `release-changelog` for release notes, or `pr-reminder` for stale PR
  reminders. 可选，消息模式。
- `stale_prs`: optional, JSON array of stale pull requests for `pr-reminder`
  mode. 可选，`pr-reminder` 模式下待提醒 PR 的 JSON 数组。
- `threshold_days`: optional, minimum open days for `pr-reminder` mode, defaults
  to `3`. 可选，PR 打开超过多少天后提醒，默认 `3`。
- `repository_name`: optional, repository name shown in `pr-reminder` mode. 可
  选，PR 提醒卡片里展示的仓库名。
- `report_url`: optional, workflow run or report URL shown in `pr-reminder`
  mode. 可选，PR 提醒卡片里的检查详情链接。
- `max_items`: optional, maximum PRs shown in `pr-reminder` mode, defaults to
  `50`. 可选，PR 提醒卡片里最多展示多少条，默认 `50`。

Please configure `FEISHU_BOT_WEBHOOK` and `FEISHU_BOT_SIGNKEY` in the repo,
`Setting` -> `Secrets and variables` -> `Actions` -> `New Repository secrets`

请在仓库的设置中配置`FEISHU_BOT_WEBHOOK`和 `FEISHU_BOT_SIGNKEY` , 路径`Setting`
-> `Secrets and variables` -> `Actions` -> `New Repository secrets`.

In the sample above `schedule` event will post github trending to bot every day
at 2:30 UTC time. 上面例子中配置的`schedule` 事件会在每天UTC时间2:30发送github
tredning到机器人。

#### Pull request reminder

#### PR 超时提醒

Use `mode: pr-reminder` when another workflow step has collected open pull
requests that have stayed open longer than your threshold.

当你的 workflow 里已经收集到超过阈值仍未合并的 open PR 时，可以使用
`mode: pr-reminder` 发送提醒卡片。

```yaml
- name: Send stale PR reminder
  uses: Dogtiti/feishu-bot-webhook-action@main
  with:
    webhook: ${{ secrets.FEISHU_BOT_WEBHOOK }}
    signkey: ${{ secrets.FEISHU_BOT_SIGNKEY }}
    mode: pr-reminder
    repository_name: ${{ github.repository }}
    threshold_days: '3'
    stale_prs: ${{ steps.stale-prs.outputs.stale_prs }}
    report_url: >-
      ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{
      github.run_id }}
```

#### For those who want to build your own card

#### 建立自己的消息卡片

The notification card is now built directly in code with Feishu Card JSON 2.0
and its full Markdown component instead of relying on a remote CardKit template
id. You can customize the layout in `src/card.ts`, and tune event text/summary
behavior in `src/github2feishu.ts`.

现在通知卡片已经使用飞书 Card JSON 2.0 和完整 Markdown 组件在代码里直接生成，不
再依赖飞书远端 CardKit 模版 id。你可以直接在 `src/card.ts` 里改卡片布局，在
`src/github2feishu.ts` 里改事件文案和摘要逻辑。

This makes it easier to control:

- whether the actor is clickable
- how much comment content is shown
- which fields are displayed for PR / comment / review events

这样后续你要控制：

- 操作人是否可点击
- 评论内容显示多少
- PR / 评论 / Review 各自展示哪些字段

都会更容易。

### 独立发布人提醒

`release-changelog` 模式在同仓库普通分支的 PR 合入 `main` 后，在“查看完整变更”按
钮同一行右侧显示 `@发布人 单独发布`。发布人取面向 `main` 的 PR 作者
`user.login`，不取审批人、合并人或重新运行工作流的人。Git 不记录分支创建者，因此
以开发者自己创建发布 PR 为归属约定；代他人创建 PR 时需注意作者归
属。`dev -> main`、未合并 PR、其他目标分支以及 tag/push/manual 事件保持原来的卡
片，不显示独立发布标记。

调用方通过 `github_feishu_users` 传入 JSON 映射，键为 GitHub **登录名**（不是显
示名称，大小写不敏感）：

```yaml
github_feishu_users: >-
  {"example-login":{"name":"示例用户","open_id":"ou_0123456789abcdef0123456789abcdef"}}
```

`open_id` 用于飞书卡片的真实 `<at id=ou_...></at>` 提醒，`name` 仅用于维护映射。
成员映射由调用仓库维护，Action 不内置组织通讯录。缺少映射时显示 GitHub 用户链接
并记录 warning，不伪造飞书 @；无效映射或非法 open_id 会导致工作流失败。飞书客户
端的实际提醒仍要求目标用户属于消息所在群。

布局使用飞书
[分栏组件](https://open.feishu.cn/document/common-capabilities/message-card/message-cards-content/column-set)
和
[Markdown 组件](https://open.feishu.cn/document/common-capabilities/message-card/message-cards-content/using-markdown-tags)。

### 通知投递失败

发送器等待完整响应后，同时检查 HTTP 状态与飞书业务码。只有 HTTP 2xx 且
`code`（或旧版 `StatusCode`）为数字 `0` 才表示投递成功；卡片拒收、无效 JSON、连
接错误与超时都会使 Action 失败。请求设有 15 秒超时，不自动重试，避免投递结果不明
时重复提醒。

独立发布卡片分栏内直接放置 `button`，不能嵌套 `action` 容器；普通整批发布的顶层
按钮容器保持不变。
