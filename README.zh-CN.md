# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox) [![Mentioned in Awesome Claude Code](https://awesome.re/mentioned-badge.svg)](https://github.com/hesreallyhim/awesome-claude-code)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

一个 [Claude Code](https://claude.com/claude-code) mod，让你在写代码时随时看到自己在 GitHub 上的工作：等待你审查的 pull request（每个都会在你打开之前先用通俗的语言做好摘要）、你自己处于打开状态的 PR 及其收到的审查，以及需要你参与的议题。

![输入框上方的横条，随后是抽屉的三个标签页：待审查、我的 PR 和我的议题](docs/images/en/overview.gif)

## 快速开始

登录 [GitHub CLI](https://cli.github.com/)（`gh auth login`）后，在 Claude Code 会话的提示符处输入：

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
/review-inbox
```

最后一行打开抽屉。选项和更新方法见[安装](#安装)。

- **输入框上方的横条**：只用一行统计需要你处理的内容，包括等待你审查的 PR、你的 PR 中有待处理事项的，以及分配给你或提及你的议题。横条的颜色表示最早的审查请求已经等了多久（满 3 天变黄，满 14 天变红）。点击 `打开` 可打开抽屉。 数字减少时会短暂变成绿色。 开启自动审查后，代你发布的审查留在抽屉里期间，数字后面会显示 `已自动审查 N`。
- **抽屉**：使用 `/review-inbox` 打开，有五个标签页：待审查、我的 PR 和分配与提及用来处理，已保存的搜索和 GitHub 通知用来浏览。抽屉获得焦点时按 1 到 5，即可从左往右切换到对应的标签页。标签页上的数字是卡片数；已保存的搜索没有数字，GitHub 通知的数字只统计未读。
- **通知**：工作时有新内容到达，会弹出一条简短的提示。

界面和摘要支持九种语言，详见[语言](#语言)。

## 环境要求

- Claude Code 2.1.287 或更高版本，这是最早支持 mod（函数钩子插件）的版本。已在 2.1.292 上测试。mod 目前处于早期体验阶段，其 API 可能在不同版本之间发生变化。
- [GitHub CLI](https://cli.github.com/)（`gh`）已加入 `PATH` 并已登录（`gh auth login`），且有权访问你要审查的仓库。
- GitHub Enterprise Server：在启动 Claude Code 的环境中设置 `GH_HOST`，所有 `gh` 调用都会发往该主机。

## 安装

在 Claude Code 会话的输入框中执行：

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

安装界面会询问下列选项，这些选项都可以留空或保持默认值。

### 更新与卸载

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

更新在重启后生效。卸载不会删除 mod 的缓存文件夹 `~/.claude/plugins/data/review-inbox`；如需清除缓存的列表和摘要，请自行删除该文件夹。各版本的变更见[更新日志](CHANGELOG.md)。

## 配置

在安装界面中设置，之后可在 `/config` 中修改。修改立即生效。

| 选项 | 默认值 | 作用 |
| --- | --- | --- |
| `scope` | 空 | 附加到每一次搜索（`review-requested:@me`、`author:@me`、`assignee:@me`、`mentions:@me`）上的 GitHub 搜索限定符。为空表示搜索整个 GitHub。 |
| `githubUser` | 空 | 登录了多个账号时要使用的 `gh` 账号（`gh auth token -u <user>`）。为空时使用当前活动账号。 |
| `language` | `auto` | `auto`，或[语言](#语言)中列出的代码之一。 |
| `refreshMinutes` | `10` | 从 GitHub 重新获取的间隔（分钟）：5、10、15、30 或 60。所有会话共用一次获取。 |
| `repoPaths` | 空 | 下一步按钮为每个仓库让 Claude 工作的文件夹。见下文。 |
| `motion` | `auto` | 设为 `off` 时，提示栏上方那一行的数字不再闪烁。设为 `auto` 时，如果 Claude Code 的减少动态效果设置（`prefersReducedMotion`）已开启，也不闪烁。 |
| `directActions` | `off` | 设为 `on` 时，卡片上会有直接写入 GitHub 的按钮。详见下面的“直接写入 GitHub”。 |
| `autoReview` | `off` | 设为 `on` 时，在后台审查请求你审查的 PR，并把每份审查保存为你的待提交审查，直到你发布。**会明显多用 token。**这只是初始值：一旦按过待审查标签页顶部的 `自动审查` 按钮，之后就只由按钮开关，开启前会先确认。 见下面的“自动审查”。 |
| `autoReviewPost` | `pending` | 审查结束后怎么处理：`pending` 保留为待提交审查，由你在卡片上提交；`comment` 以评论提交；`verdict` 按建议的结论提交，包括批准和请求修改。不是 `pending` 时会不经确认以你的名义提交。 |
| `autoReviewModel` | `sonnet` | 审查者使用的模型：`sonnet` 或 `opus`，后者审查得更深入，费用也更高。 |
| `autoReviewVerify` | `off` | 设为 `on` 时，草稿保存前由第二个审查者逐条对照代码核实：不成立的意见删去，夸大的级别调低。有意见的审查约花费两倍 token。 |
| `autoReviewDaily` | `5` | 每天最多开始多少次自动审查：3、5、10、20 或 `unlimited`。卡片上的 `重试` 不计入。 |
| `autoReviewSettleMinutes` | `30` | PR 最后一次提交后，等待多少分钟再开始自动审查，因为作者常在请求后马上再次推送：0、10、30、60 或 120。`0` 表示立即开始。 |
| `autoReviewSkills` | 空 | 加载到审查者中的技能，用逗号分隔，例如你的审查手册。为空表示不加载任何技能。 |
| `autoReviewInstructions` | 空 | 用自己的话写给审查者的指示，例如先看什么、评论怎么写。为空表示不添加。 |
| `autoReviewSeverityNames` | 空 | 审查中四个严重程度的名称，从 blocker 到 nit 依次用逗号分隔，例如 `阻塞, 需决定, 待改进, nit`。为空时使用该语言的默认名称。 |
| `autoReviewLarge` | `on` | 设为 `on` 时，超过 50 个文件或 2,000 行改动的 PR 也会审查，会多用很多 token。设为 `off` 则跳过。 |
| `autoReviewMaxTurns` | `40` | 审查者在回答前可用的轮数：`40`、`60`、`80` 或 `120`。大型 PR 可能需要更多；用完轮数的审查会失败，卡片上会说明轮数已用完。 |
| `autoReviewTools` | `read` | 审查者能用什么。`read` 只让它读取 diff 和代码。`all` 像你亲自请求审查时一样，给它你会话中的所有工具并沿用会话的权限：它可以运行测试和命令、读取 PR 的描述、评论和检查结果、打开其他仓库，但 PR 的文字也可能借此试图操纵这些命令。 |
| `autoReviewBacklog` | `on` | 设为 `on` 时，开启自动审查之前提出的请求也会审查，按 `autoReviewDaily` 允许的数量每天审查几个。设为 `off` 则跳过。 |

`scope` 可以填写 GitHub [议题和 PR 搜索](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)支持的任何内容：

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

重复使用 `org:`、`repo:` 和 `user:` 限定符时，匹配其中任意一个即可。按照 GitHub 对 `review-requested:@me` 的定义，向团队发出的审查请求也算作对你的请求。

`repoPaths` 用逗号分隔多个 `owner/repo=路径`。`owner/*=路径/*` 适用于该 owner 的所有仓库，路径中的 `*` 代表仓库名；精确名称优先于通配符，`~` 是主文件夹。这里指定的文件夹优先于会话自己的文件夹和 mod 记住的文件夹。

```text
my-org/*=~/code/*
my-org/legacy=~/old/legacy-app
```

## 标签页

每个标签页按类别分组显示卡片。点击类别标题可折叠，再点击一次即可展开。标签页顶部的 `已隐藏 N · 全部显示` 只恢复该标签页中隐藏的卡片。

卡片 `▸ 操作` 里的 `备注` 可以在标题上方写一行，用来记下你检查了什么，或者约定了何时做什么。点击 `保存` 后卡片仍然显示。`推迟到明天` 和 `推迟到下周` 会把卡片隐藏到明天或下周一上午 9 点；在那之前如果有新动态，会立即重新显示。新动态指：待审查 PR 有新提交，你的 PR 状态改变或有新审查，议题有新活动。推迟的卡片回来时，会带着备注弹出通知。`清除` 会删除备注。

顶部的搜索框不分标签页，一次搜索全部内容：仓库、编号、标题、作者、正文前 2,000 个字符、摘要和你的备注。已隐藏或已推迟的卡片也能搜到，并标注 `已隐藏`。清空搜索框即可回到标签页。Claude 移动端应用尚不绘制输入框，因此在移动端只显示备注，没有搜索和 `备注` 按钮。

会话正在处理的卡片会集中到待审查和我的 PR 标签页顶部的 `会话中正在处理`，并显示该会话的文件夹名或 `此会话`。如果某个会话的文件夹在该仓库中检出了我的 PR 的分支，这个 PR 就会出现在这里；任何卡片只要其 PR 链接出现在某个会话的提示中（就像 `让 Claude 审查` 所做的那样），也会出现在这里。会话关闭或 10 分钟没有消息后，卡片会回到原来的分组。

如果有会话仍在运行旧版本的 mod（例如更新前打开且没有重新加载的会话），列表窗口标题下方会显示类似 `2 个会话仍是旧版本 (dhub2) · 请在那些会话中运行 /reload-plugins` 的提示。这类会话把列表保存在自己的文件中，因此最新的会话不会混入旧列表或错误。 点击旁边的 `全部重新加载`，会通过缓存文件夹中的 `reload.json` 向这些会话发出请求，每个会话空闲时会自行运行 `/reload-plugins`，该会话的其他插件也会一并重新加载。只有 0.13.0 及以后的会话能响应请求，更旧的会话仍需在其中手动运行一次。

当前会话所在仓库的卡片排在每个分组最前面，并标有 `此仓库`。如果标签页中还有其他仓库，标签页上方的 `此仓库 N` 和 `全部 N` 可以只看这个仓库，或者恢复显示全部；提示栏上方的那一行始终统计全部。当前会话的仓库与 `gh` 的判断方式相同：设置了 `GH_REPO` 时用它，否则用文件夹的 GitHub 远程仓库。

卡片标题下方显示最多两个标签（其余显示数量）、评论数，以及 PR 指向的不是仓库默认分支时的 `→ 分支`。

卡片仓库名前的 `●` 表示自你上次关闭抽屉以来有更新，就像 GitHub 收件箱标出你上次访问后变化的内容。第一次关闭之前不会标记任何卡片。

没有任何需要你处理的事项时（没有审查请求、没有需要处理的 PR、没有分配给你或提到你的议题），抽屉会在标签页上方显示 `✓ 没有需要你处理的事项`，提示栏上方的那一行保持隐藏。

### 待审查

每个等待你审查的 PR 对应一张卡片，内容包括一句话摘要、PR 的原因、影响范围、规模和作者，以及你的审查已等待多久。有风险的事项（例如 schema 变更或必须遵守的部署顺序）会标记 ⚠️。

- 点击 `让 Claude 审查` 后，卡片会标记为 `已添加`，抽屉保持打开，因此可以连续挑选多个 PR。关闭抽屉（Esc 或 ×）时，每个已添加 PR 的审查请求会放入输入框，并附上该 PR 的警告以及你上次审查后的变更。在你按下 Enter 之前，不会发送任何内容。如果输入框中已有的内容已经请求审查某个 PR，打开抽屉时该 PR 会显示为 `已添加`。
- `▸ 操作` 里的 `隐藏` 会隐藏这张卡片，直到该 PR 有新的提交。
- `已重新请求` 用于标记你已经审查过、又再次请求你审查的 PR，并附上你上次审查后变更内容的简短摘要。
- 卡片分为直接请求、团队请求和草稿三组。

![在两张卡片上点击审查，卡片标记为已添加；点击隐藏隐藏第三张；按 Esc 将两个审查请求放入输入框](docs/images/en/review.gif)

审查请求还会附带一行文字，描述你平时的审查方式，让 Claude 按你的方式进行审查。mod 每周一次读取你最近审查过的最多 30 个 PR 上你本人留下的评论，请 Claude 描述你使用的语言和语气、你最先关注什么，以及你提出要求时的措辞。如果可供学习的评论少于五条，审查请求就不带这一行；如果学习失败，则保留上一次的描述，mod 会在一天后重试。以你的名义发布的自动审查不计入，只从你自己写的评论中学习。

### 我的 PR

列出你处于打开状态的 PR，显示状态而不是摘要，并按你需要处理的先后排序：请求更改、CI 失败、合并冲突、等待审查（等待最久的在前）、已批准、在合并队列中、草稿。正在运行的 CI 会显示在状态旁边。进入合并队列的 PR 显示为 `在合并队列中`：队列检查通过后 GitHub 会合并它，所以提示栏上方的那一行不计入它，也不会显示 `可以合并`。

`隐藏` 会隐藏 PR，直到它的状态改变或有人新提交审查；仅仅你自己推送新提交不会让它重新出现。

![我的 PR：从请求更改到草稿共六个 PR，其中两个有新审查](docs/images/en/my-prs.png)

在你最新一次提交之后提交的审查会显示为 `新审查`，并注明审查者，直到你再次提交为止。批准、请求更改和仅含评论的审查都算在内，讨论串中的回复也算，无论来自人还是机器人；被驳回的审查不算。这样的 PR 会计为待处理事项，并排在同一状态下没有新动态的 PR 之前。不调用模型。

轮到你处理的 PR（请求更改、CI 失败或合并冲突）会有一个下一步按钮：`处理评论`、`修复 CI` 或 `解决冲突`。按钮旁显示 Claude 将要工作的文件夹：当前会话位于该仓库的克隆中时显示 `此文件夹`，有会话曾在该仓库中运行时显示那个文件夹，否则显示 `没有本地克隆`。按钮会像 `让 Claude 审查` 一样添加卡片。关闭抽屉时，请求会写明这一步以及读取评论或失败日志的 `gh` 命令，并要求 Claude 在新的 worktree 中工作，不动那个文件夹的分支。没有已知文件夹时，Claude 会问你克隆在哪里，或建议 `gh repo clone` 并等你同意。不会增加 GitHub 调用，也不调用模型。

### 分配与提及

列出分配给你的打开状态的议题，以及提及你的打开状态的议题和 PR；同时符合两者的条目只显示一次，归为“分配给我”。下方列出最近 30 天内引用了你的议题或 PR 的其他议题和 PR，并注明引用者。你自己做出的引用不包括在内，且只显示最新的 20 条。不调用模型。

条目分为分配、提及和引用三组。`隐藏` 会隐藏条目，直到它有新的动态。

![我的议题：分配给你的议题、提及你的内容，以及别处对你工作的引用](docs/images/en/my-issues.png)

分配给你的议题会有一个工作方式相同的 `开始处理` 按钮：Claude 会阅读议题、规划改动，并在新 worktree 的新分支上开始。

### 已保存的搜索

你自己命名并保存的 GitHub 搜索，每个都会成为一个分区，显示结果数量和最近更新的 20 项。点击标题会在 GitHub 上打开那个 PR 或议题，`在 GitHub 上还有 N 个` 会在 GitHub 上打开同一个搜索。和 GitHub 自己的 PR 收件箱一样，内置了三个：`与我相关的 PR`（我参与但不是我创建的打开的 PR）、`我审查过且仍打开的 PR` 和 `我创建的打开议题`。点击分区标题可以折叠。每次刷新时搜索三个一组地运行；失败的搜索只显示原因，不影响其他搜索。不调用模型。

自己的搜索添加到与卡片按钮相同的 `actions.json` 的 `groups` 中；`/review-inbox add-search` 会让 Claude 和你一起写一个。

```json
{
  "groups": [
    { "id": "team", "name": "团队 PR", "query": "org:acme is:open label:urgent", "scope": "prs", "countInBand": true },
    { "id": "reviewed-by-me", "hidden": true }
  ]
}
```

`query` 使用 GitHub 搜索语法。`scope` 为 `prs` 或 `issues`：查询没有写明类型时会加上 `is:pr` 或 `is:issue`；查询没有自己的 `sort:` 时会加上 `sort:updated-desc`。`scope` 设置和 `此仓库` 按钮不会缩小这些搜索，需要时请直接在查询里写 `org:` 或 `repo:`。`"countInBand": true` 会把该搜索的数量以 `已保存的搜索 N` 加到提示栏上方的那一行。与内置搜索 id 相同的已保存的搜索会替换它，`"hidden": true` 会移除它。缺少字段或 scope 不正确的条目会被跳过，抽屉底部会显示警告，`/review-inbox buttons` 会列出原因。只运行前 15 个已保存的搜索。

### GitHub 通知

其他标签页尚未显示的 GitHub 通知，按原因分成多个分区（`评论`、`状态变更`、`CI 运行` 等），每个分区内从新到旧排列；点击分区标题可以折叠。内容包括你创建或参与的会话中的评论、状态变更和新动态，团队提及以及安全警报。你触发的 GitHub Actions 工作流运行结束的通知也会以 `CI 运行` 显示，点开是该仓库的 Actions 页面。只有在 GitHub 设置的 Notifications → System → Actions 中开启 GitHub 通知时，GitHub 才会发送这类通知。审查请求、分配和提及不在这里，PR 或议题已经是卡片的会话也不在这里。未读会话标有 `●`，标签页的数字统计的就是它们。读取最近 30 天的通知，最多 100 条。

按下 `完成` 或 `取消订阅` 后，该行立即消失，原处显示 `已完成 · 撤销` 或 `已取消订阅 · 撤销` 10 秒；在此之前关闭抽屉会立即发送。之后 `完成` 会像 GitHub 收件箱一样把会话标记为完成，`取消订阅` 还会停止该会话的通知，直到有人提及你或你发表评论。标记为完成的会话有新动态时会再次出现。如果失败，该行会带着原因回来。不调用模型。

GitHub 只向 gh 自己的登录和经典令牌提供通知。没有权限时，标签页会说明这一点并给出方法（`gh auth login` 或 `gh auth refresh -s notifications`）。

### 通知

以下情况会弹出通知：新的审查请求；你的某个 PR 收到新审查；你的某个 PR 变为请求更改、CI 失败或合并冲突；新的分配、提及或引用。新会话不会逐条通知，而是用一条通知汇总上次有会话查看之后的变化，例如 `你离开期间 · CI 失败 2`；没有变化时不提示。开启自动审查后，审查完成或代你发布时也会弹出通知。多条通知同时到达时会依次显示，间隔 4.5 秒。

你的 PR 获得批准且没有正在运行的 CI 时，会提示一次 `可以合并`。

![输入框下方依次出现三条通知：新的审查请求、你的 PR 被请求更改、新的提及](docs/images/en/toasts.gif)

### 卡片按钮

点击卡片上的 `▸ 操作` 会打开 `备注` 和 `隐藏`，以及一排按钮，每个按钮都会带着预设的请求把卡片交给 Claude：审查请求上有 `总结风险`、`解释改动` 和 `起草批准评论`，你的 PR 上有 `起草给审查者的回复` 和 `调查 CI 失败`。按钮会像 `让 Claude 审查` 一样添加卡片，关闭抽屉时请求会进入你的输入框。在你按 Enter 之前，不会运行或发布任何内容。

可以在缓存文件夹的 `actions.json` 中添加自己的按钮。`/review-inbox buttons` 会显示它的路径、内容和被跳过的条目，`/review-inbox add-button` 会让 Claude 和你一起写一个。

```json
{
  "buttons": [
    { "id": "test-plan", "name": "测试计划", "scope": "review", "prompt": "在 {{.RepoPath}} 中为 {{.PrUrl}} 写一份测试计划。" },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` 是 `review`、`pr` 或 `issue`。prompt 中可以像 gh-dash 一样以 `{{.Name}}`, `{{Name}}`, `{{ .Name }}` 的形式使用 `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`；卡片没有值的变量会留空。与内置按钮 id 相同的按钮会替换它，`"hidden": true` 会移除它。缺少字段、scope 或变量名未知的条目会被跳过，抽屉底部会显示警告，`/review-inbox buttons` 会列出原因；其余按钮照常工作。`PrTitle` 和 `Author` 原样来自 GitHub，所以使用它们的 prompt 会把别人写的文字交给 Claude。

### 直接写入 GitHub

把 `directActions` 设为 `on` 后，卡片上会多出直接写入 GitHub 的按钮，以你的 `gh` 账号发出。

- 审查请求上有 `批准`，你的草稿 PR 上有 `标记为可审查`，基础分支已经前进的你的 PR 上有 `更新分支`。这些操作别人看得到，也无法撤回，所以第一次按下时，按钮那一行会变成一行说明：要发送什么、以哪个账号发送，例如 `批准 o/r#5 "Fix login"，身份 kim —（无评论）`。按 `确认批准`，或在抽屉接收按键时按 `y`，才会发送；按 `取消` 或等 10 秒，按钮就会回来。焦点会移到 `取消`，第一次按下后 300ms 内的确认会被忽略，所以按住 Enter 也不会发送。
- 批准不带评论，并指定你看过的那个提交。如果之后有了新提交，就不发送，并在卡片上说明。`更新分支` 会合并基础分支，从不 rebase。
- 检查失败的你的 PR 上，`重新运行失败的 CI` 会重新运行最新提交上 GitHub Actions 运行中失败的任务。提到你的 issue 上，`分配给我` 会立即发送，并在 10 秒内显示 `撤销`。
- 失败的写入会和 GitHub 的消息一起留在卡片上，按钮也会回来。

不会直接合并。已批准且没有正在运行的检查的你的 PR，即使 `directActions` 关闭，也会有 `合并` 按钮：按下后，提示栏里会加入一条请求，让 Claude 先确认仓库允许的合并方式再运行 `gh pr merge`；你按 Enter 发送后，Claude Code 会请求运行权限。

### 自动审查

把 `autoReview` 设为 `on` 后，直接请求你审查的 PR 会由 Claude 在后台阅读，等你看到卡片时审查已经在那里等着了。在你按下按钮之前，作者只会在审查运行期间看到你在 PR 上留下的 👀 表情回应。这是 `autoReviewPost` 为默认值 `pending` 时的情况。

> **会明显多用 token。** 每次审查都会运行一个子代理，它带着你的 CLAUDE.md、你的 hooks 和 `autoReviewSkills` 中的技能，阅读 diff 和代码：每个 PR 要用几万个 token，用 `opus` 更多。卡片上会显示每次审查的花费，`autoReviewDaily` 限制每天最多开始多少次。

- **什么会触发。** 直接向你发出（不是向团队）的请求，PR 不是草稿、也不是机器人创建的，并且从最后一次提交的时间起已过了 `autoReviewSettleMinutes`（默认 30 分钟）。你的所有会话中同一时间只运行一次审查。你的其他机器看到这个 👀 就会跳过该 PR；审查中途停下的机器留下的 👀，一小时后由其他机器接手。在你开启之前提出的请求，以及超过 50 个文件或 2,000 行改动的 PR，也会审查；把 `autoReviewBacklog` 或 `autoReviewLarge` 设为 `off` 则跳过。待审查标签页顶部的 `自动审查` 按钮会在所有会话中开关自动审查；按过一次之后，再修改 `/config` 中的 `autoReview` 不再有任何作用。没有到期的审查时什么都不运行：不请求模型，也不启动代理。
- **设置向导。** 第一次用待审查标签页的 `自动审查` 按钮开启时，提示框里会放入一条设置请求，列出除开关（由按钮决定）以外每项自动审查设置的作用、可填的值、默认值和当前值。按 Enter 后，Claude 会和你逐项设置，并把你选的值写到 `/config` 保存它们的位置；改动从下一个会话起生效。随时可以用 `/review-inbox auto-review-config` 放入同样的请求。
- **由哪个会话运行。** 你打开 `自动审查` 按钮的那个会话负责在本机启动审查，开启前的确认也会说明这一点。在别的会话中运行 `/review-inbox auto-review-here` 可把审查移过去，运行 `/review-inbox auto-review-anywhere` 则任何会话都可启动。该会话关闭期间，排队的 PR 会等待，卡片上会标明。
- **读取什么。** 默认情况下审查者只有只读工具（`Read`、`Grep`、`Glob`），没有 shell；把 `autoReviewTools` 设为 `all` 时，它改为获得你会话中的所有工具并沿用会话的权限，并被要求在询问作者之前先自己运行核实，且不得发布、推送或修改任何他人可见的内容。mod 把 PR 的 diff 写入一个运行文件夹；如果是重新请求，还会写入自你上次审查以来的 diff。当它知道仓库的文件夹（下一步按钮使用的那个）时，还会在那里把 head 提交检出为分离的 worktree，审查保存后删除。
- **如何审查。** 无论设置了哪些技能和指示，审查者都会拿到 mod 自带的审查规则和写作规则。每条发现保留前都会重新阅读代码确认，无法确认的改为向作者提问，并按合并后的代价分为阻断、重要、次要、细节。它为第一次读这段代码的人而写：不寒暄，先给结论，只有确有亮点时才用一句话提到做得好的地方；每条发现是一段短文，说明会出什么问题、需要决定或保证什么，代码内部如何运作和怎么修改留给作者；评论已经挂在那段代码上，所以不再写文件和行号；也不写自己如何检查。没有阻止合并的问题时，即使有次要或细节发现也会批准。`autoReviewInstructions` 优先于这些规则，学到的审查风格只用于语气。
- **写入什么。** 结果会作为你的**待提交审查**写入 GitHub，只有你自己能看到：评论放在它们所针对的行上，diff 之外的内容按严重程度分组放在审查正文里。每条发现的第一行用粗体写出严重程度和结论，理由写在下一行。严重程度的名称使用 mod 的语言，或使用 `autoReviewSeverityNames` 设定的名称。卡片上显示建议的结论、按严重程度分类的发现、最重要的三条和花费。 这些卡片留在原来的请求分组里，在那里提交或丢弃。 `autoReviewPost` 为 `comment` 或 `verdict` 时，保存后立即提交，该 PR 会离开待审查标签页；之后它会连同结论显示在 `自动审查` 按钮正下方的 `自动审查完成` 分组里，这样自动提交的审查不会被错过。点该行的 `全部确认` 会清空这个分组。GitHub 拒绝提交时，它会作为待提交审查留在卡片上。
- **发布。** `作为评论发布`、`发布并批准` 和 `发布并请求更改`（建议的那个带颜色）会像直接写入 GitHub 那样先在卡片上确认，然后提交待提交审查。`在 GitHub 上打开` 会打开该 PR 的文件页，你可以先在那里修改。`在会话中完善` 取代 `让 Claude 审查`，请 Claude 和你一起完善这份审查，只有你说出结论后才会提交。`丢弃` 会删除它。即使没有开启 `directActions`，这些按钮也会显示。
- **新提交。** PR 有了新提交、被关闭或合并，或不再请求你审查时，正在运行的审查会停止。不改变内容的 rebase 会把你的待提交审查连同你的修改移到新提交上，不会请求 Claude。其他新提交则让它留在原处：卡片会说明现在发布会审查已不存在的代码，并提供 `重新审查`。如果卡片绘制之后 PR 又有了变化，发布会被拒绝。
- **失败。** 无法读取的回答，或审查者读不到 diff 时，会再试一次，之后卡片会显示原因并提供 `重试`。你从任务列表中停止的审查会等待 `重试`。会话关闭时正在进行的审查会从队列最前面重新开始。

## 语言

横条、抽屉、通知、放入输入框的审查请求，以及模型生成的摘要、审查风格描述和自动审查，都使用同一种语言。

| 代码 | 语言 |
| --- | --- |
| `en` | 英语（English） |
| `ko` | 韩语（한국어） |
| `ja` | 日语（日本語） |
| `zh-CN` | 简体中文 |
| `zh-TW` | 繁体中文（繁體中文） |
| `es` | 西班牙语（Español） |
| `pt-BR` | 巴西葡萄牙语（Português do Brasil） |
| `de` | 德语（Deutsch） |
| `fr` | 法语（Français） |

- 填写代码即使用对应的语言。
- `auto`（默认值）：如果 Claude Code 自身的 `language` 设置指定的是上表中的某种语言，无论用代码、英文名称还是该语言自己的名称表示（`ja-JP`、`Japanese`、`日本語`），都跟随该设置；否则跟随系统区域设置（依次为 `LC_ALL`、`LC_MESSAGES`、`LANG`）；都没有时使用英语。中文默认按简体处理，除非标明为台湾、香港、澳门或繁体（`zh-TW`、`zh-Hant`、`繁體中文`）；葡萄牙语按巴西葡萄牙语处理。

摘要和审查风格描述按语言分别缓存，因此切换语言后，每条摘要和该描述都会用新语言再生成一次。其他语言一律回退到英语。

英语和韩语以外的语言由 Claude 翻译，尚未经过母语者检查；本 README 也是用同样的方式翻译的。欢迎通过议题或 pull request 提交更正：每种语言对应 [`hooks/locales/`](hooks/locales/) 中的一个文件，其他所有语言表都以英语表为准，英语表位于 [`hooks/i18n.ts`](hooks/i18n.ts)。

## 读取和运行的内容

mod 只通过你自己的 `gh` 访问 GitHub；它把 PR 文本发给 Claude 以生成摘要，并每周一次把你本人的审查评论发给 Claude 以描述你的风格；它只写入自己的缓存文件夹。下面逐项列出它涉及的内容及原因，与 `claude plugin validate .` 为该 mod 列出的内容一致。开启 `autoReview` 后，它还会请 Claude 审查 PR，把每份审查作为你的待提交审查保存在 GitHub 上或按 `autoReviewPost` 发布，并在审查运行期间向仓库的文件夹添加一个 worktree。

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **运行 `gh`**：用 `gh api graphql` 获取列表，并每周一次获取你最近的审查评论；对已重新请求的 PR 运行 `gh api repos/<owner>/<repo>/compare/<from>...<to>`；设置了 `githubUser` 时运行 `gh auth token -u <githubUser>`。GitHub 通知标签页运行 `gh api notifications`；按下 `完成` 或 `取消订阅` 时运行 `gh api -X DELETE notifications/threads/<id>`（取消订阅时先加上 `/subscription`）。`directActions` 为 `on` 时，按下按钮会先运行 `gh api user` 取得账号名、`gh api repos/<owner>/<repo>/pulls/<n>` 读取最新提交，再运行 `gh api -X POST …/pulls/<n>/reviews`（`event=APPROVE`、`commit_id`）、`gh pr ready`、`gh api -X PUT …/pulls/<n>/update-branch`、`gh api …/actions/runs?head_sha=<sha>&status=failure` 加 `gh api -X POST …/actions/runs/<id>/rerun-failed-jobs`，或 `gh api -X POST`/`-X DELETE …/issues/<n>/assignees` 之一。开启 `autoReview` 后，它会在每次审查前后运行 `gh api …/pulls/<n>/reviews` 和 `…/pulls/<n>/files`，运行 `gh pr diff`，并运行 `gh api -X POST …/pulls/<n>/reviews`（审查内容通过 stdin 传入）把审查保存为你的待提交审查；把它移到新提交时，会读取 `…/reviews/<id>` 和 `…/reviews/<id>/comments`，并在重新创建之前运行 `gh api -X DELETE …/reviews/<id>`。每次审查前后，它用 `gh api -i -X POST …/issues/<n>/reactions`（`content=eyes`）和 `gh api -X DELETE …/issues/<n>/reactions/<id>` 添加和移除这个 👀。卡片上的按钮会在读取 head 提交之后，运行 `gh api -X POST …/reviews/<id>/events`（`event=COMMENT`、`APPROVE` 或 `REQUEST_CHANGES`）或 `gh api -X DELETE …/reviews/<id>`。`autoReviewPost` 为 `comment` 或 `verdict` 时，会接着对保存的审查运行 `gh api -X POST …/reviews/<id>/events`（`event=COMMENT`、`APPROVE` 或 `REQUEST_CHANGES`）。 除此之外，mod 自身不发起任何网络调用。
- **运行 `git`**：每 30 秒在会话文件夹中运行 `git branch --show-current` 和 `git remote -v`，以找到位于你的 PR 分支上的会话；并运行 `git rev-parse --path-format=absolute --git-common-dir`，以记住该仓库的主文件夹。开启 `autoReview` 且知道仓库的文件夹时，每次审查都会在那里运行 `git fetch origin pull/<n>/head` 和 `git worktree add --detach`，审查结束时运行 `git worktree remove --force`。
- **请求 Claude**（`sonnet` 模型）生成每条摘要，发送的内容包括 PR 的仓库名、标题、描述（前 12,000 个字符）、变更的文件路径（最多 80 个）和规模；对于已重新请求的 PR，还会发送你上次审查以来每条提交信息的第一行，以及这期间最多 60 个文件路径。这会计入你的 Claude Code 用量。每个 PR 在每个 head 提交、每种语言下只生成一次摘要；生成失败的摘要，每个提交最多尝试三次。此外，mod 每周一次发送你最近审查过的最多 30 个 PR 上你本人的审查评论，每条截取前 500 个字符，最多 60 条、合计不超过 12,000 个字符，用于描述你的审查风格；少于五条时不发送任何内容。
- **启动子代理**，仅在开启 `autoReview` 时：同一时间一个 `auto-reviewer`，使用 `autoReviewModel`（开启 `autoReviewVerify` 时还有第二个代理核对其发现），带只读工具（`autoReviewTools` 为 `all` 时为你会话中的所有工具）、你的 CLAUDE.md、hooks 和 `autoReviewSkills`。这会计入你的 Claude Code 用量。它的代理类型不会出现在你自己的 Claude 可选的列表中。停止它使用 `TaskStop`。
- **写入文件**：只写入其缓存文件夹 `~/.claude/plugins/data/review-inbox`（设置了 `CLAUDE_CONFIG_DIR` 时，用它代替 `~/.claude`）。`inbox-<hash>-f<n>.json` 保存列表和摘要；`hidden-<hash>.json` 保存已隐藏的 PR；`notes-<hash>.json` 保存备注和推迟（与语言无关，每个账户和范围一个文件）；`sessions.json` 保存每个活动会话的文件夹名、mod 版本、分支、GitHub 远程仓库和提示中出现的 PR 链接（与账户无关，一个文件）； `repos.json` 保存会话运行过的每个 GitHub 仓库的主文件夹（供下一步按钮使用）； `style-<hash>.json` 保存你的审查风格描述。每个文件先写入旁边的临时文件，再用 `mv` 替换，因此其他会话不会读到写了一半的文件；在没有 `mv` 的环境（如 Windows）中则直接写入。如果你创建了 `actions.json`，只会从那里读取，从不写入。`autoreview-<hash>.json` 保存每个 PR 在自动审查中的状态和最近一次结果，`runs/` 保存运行文件夹，审查结束时用 `rm -rf` 删除。
- **读取环境变量**：读取 `CLAUDE_CONFIG_DIR`、`HOME` 和 `USERPROFILE` 来找到该文件夹；像 `gh` 一样读取 `GH_REPO` 来确定当前会话的仓库；只有 `language` 为 `auto` 时才读取 `LC_ALL`、`LC_MESSAGES` 和 `LANG`。不设置任何环境变量。
- **读取 Claude Code 设置**：只有 `language` 为 `auto` 时才读取 `language` 键，只有 `motion` 为 `auto` 时才读取 `prefersReducedMotion` 键。
- **读取并填写输入框**：仅在抽屉打开和关闭时进行。打开抽屉时读取输入框中已有的内容，以标记其中已经请求审查的 PR；关闭抽屉时，把你添加的 PR 的审查请求另起新行，追加到已有内容之后。

## 工作原理

你打开的所有会话共享同一次获取：最多每 10 分钟由一个会话向 GitHub 请求一次，其他会话读取它保存的结果。

每个打开的 Claude Code 会话都会运行该 mod，但同一账号、scope 和语言组合共用一个缓存文件，已隐藏的 PR 也是如此。每个会话每 30 秒读取一次该文件。只有发现文件已超过 10 分钟、并成功完成一次短时认领的会话才会调用 GitHub，因此打开十个会话也只会发出一次请求。负责获取的会话在工作期间会续期认领；3 分钟未续期的认领会被其他会话接管。获取失败时保留上一次成功获取的列表，并在 1 分钟后重试。点击抽屉中的 `↻` 可立即获取。

一次 GraphQL 搜索就能返回所有等待你审查的 PR 及卡片所需的信息，另一个包含三次搜索的请求负责填充“我的 PR”和“分配与提及”。引用来自你创建的 PR 和议题上的交叉引用事件。条目被引用时，GitHub 不会更新它的 `updatedAt`，因此 mod 会在最近 60 天内有过更新的条目中查找最近 30 天内的引用，每个请求检查 50 个条目。如果 GitHub 拒绝引用搜索（它对每次查询有资源上限），则保留上一次的引用结果，其他标签页仍照常更新。

`refreshMinutes` 可以修改这 10 分钟。

## 限制

- 等待你审查的 PR 最多 100 个，按 GitHub 的最佳匹配顺序排列。其他标签页最多读取你的 100 个打开状态的 PR、100 个分配给你的议题和 100 个提及你的议题，以及最多 500 个最近有更新的条目中的引用，均按最新活动在前排序。 超出这些数量时，计数显示为 `100+`。 每个列表每次读取 25 个（条目较轻的引用每次 100 个），先到的列表先显示；GitHub 超时的那一页会以一半的大小重新请求，因此 PR 很多的账号也不会超出 GitHub 的时间限制。
- 已保存的搜索只显示最近更新的 20 项；数量是 GitHub 给出的该搜索的总数。
- GitHub 通知标签页读取最近 30 天的通知，最多 100 条，并且不会比 GitHub 规定的轮询间隔更频繁地查询。
- 如果被引用的条目你已有 60 天没有动过，这条引用会被漏掉。
- PR 有任何新提交时，`新审查` 都会消失，包括通过 GitHub 的“Update branch”按钮或由机器人产生的提交。
- 如果强制推送改写了你审查过的提交，已重新请求的 PR 不会显示“我上次审查后的变更”这一行。
- 你的审查风格是从 GitHub 搜索 `reviewed-by:@me -author:@me` 返回的 PR 中学习的，范围限于 `scope`，因此你在自己创建的 PR 上留下的评论不计入。PR 对话中不属于任何审查的评论不在学习范围内。
- `重新运行失败的 CI` 只重新运行 GitHub Actions；其他 CI 服务的检查请在该服务上重新运行。不提供一次批准多个 PR，也不提供带评论的批准。
- 自动审查审查的是 GitHub 上现有的 PR；它不运行测试或构建。只有每个文件的 patch 都相同时，才会移动已有的审查，因此 rebase 到一个改动了相同文件的基础分支上，会重新审查。
- 被 `autoReviewDaily` 拦下的审查，也会拦下把审查移到新提交的操作。`rm -rf` 仅适用于 POSIX，所以在没有 WSL 的 Windows 上，运行文件夹会留在缓存文件夹中。

## 故障排查

- **抽屉显示 `gh` 错误。** 运行 `gh auth status`。如果登录了多个账号，请设置 `githubUser`。mod 每分钟重试一次。
- **横条没有出现。** 只有存在需要你处理的内容时才会显示；计数为零的项不显示。
- **语言与预期不符。** 在 `/config` 中把 `language` 设为某个语言代码，而不是 `auto`。
- **其他问题。** 用 `claude --debug` 启动 Claude Code；本 mod 输出的行以 `review-inbox:` 开头。

## 开发

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` 和 `claude plugin test` 无需登录，CI 会在经过测试的 Claude Code 版本上运行这两条命令。`tsconfig.json` 继承自 `.claude-plugin/types/tsconfig.json`，该文件由 Claude Code 在首次从此文件夹加载 mod 时生成（并被 `.gitignore` 排除），因此在用 `tsc -p .` 做类型检查之前，请先运行一次 `claude --plugin-dir .`。

## 支持

如果 Review Inbox 帮你节省了时间，欢迎[请我喝杯咖啡](https://ko-fi.com/riversound) ☕ —— 这能让项目持续前进。谢谢！

<a href="https://ko-fi.com/riversound"><img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support me on Ko-fi" height="36"></a>

## 许可证

[MIT](LICENSE)
