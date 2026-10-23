# Review Inbox

[![validates](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-validates.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

一个 [Claude Code](https://claude.com/claude-code) mod，让你在写代码时随时看到自己在 GitHub 上的工作：等待你审查的 pull request（每个都会在你打开之前先用通俗的语言做好摘要）、你自己处于打开状态的 PR 及其收到的审查，以及需要你参与的议题。

- **输入框上方的横条**：只用一行统计需要你处理的内容，包括等待你审查的 PR、你的 PR 中有待处理事项的，以及分配给你或提及你的议题。横条的颜色表示最早的审查请求已经等了多久（满 3 天变黄，满 14 天变红）。点击 `打开` 可打开抽屉。 数字减少时会短暂变成绿色。
- **抽屉**：使用 `/review-inbox` 打开，有三个标签页：待审查、我的 PR 和我的议题。
- **通知**：工作时有新内容到达，会弹出一条简短的提示。

![输入框上方的横条，随后是抽屉的三个标签页：待审查、我的 PR 和我的议题](docs/images/en/overview.gif)

界面和摘要支持九种语言，详见[语言](#语言)。

## 标签页

每个标签页按类别分组显示卡片。点击类别标题可折叠，再点击一次即可展开。标签页顶部的 `已隐藏 N · 全部显示` 只恢复该标签页中隐藏的卡片。

每张卡片上的 `备注` 可以在标题上方写一行，用来记下你检查了什么，或者约定了何时做什么。点击 `保存` 后卡片仍然显示。`推迟到明天` 和 `推迟到下周` 会把卡片隐藏到明天或下周一上午 9 点；在那之前如果有新动态，会立即重新显示。新动态指：待审查 PR 有新提交，你的 PR 状态改变或有新审查，议题有新活动。推迟的卡片回来时，会带着备注弹出通知。`清除` 会删除备注。

顶部的搜索框不分标签页，一次搜索全部内容：仓库、编号、标题、作者、正文前 2,000 个字符、摘要和你的备注。已隐藏或已推迟的卡片也能搜到，并标注 `已隐藏`。清空搜索框即可回到标签页。Claude 移动端应用尚不绘制输入框，因此在移动端只显示备注，没有搜索和 `备注` 按钮。

会话正在处理的卡片会集中到待审查和我的 PR 标签页顶部的 `会话中正在处理`，并显示该会话的文件夹名或 `此会话`。如果某个会话的文件夹在该仓库中检出了我的 PR 的分支，这个 PR 就会出现在这里；任何卡片只要其 PR 链接出现在某个会话的提示中（就像 `审查` 所做的那样），也会出现在这里。会话关闭或 10 分钟没有消息后，卡片会回到原来的分组。

当前会话所在仓库的卡片排在每个分组最前面，并标有 `此仓库`。如果标签页中还有其他仓库，标签页上方的 `此仓库 N` 和 `全部 N` 可以只看这个仓库，或者恢复显示全部；提示栏上方的那一行始终统计全部。当前会话的仓库与 `gh` 的判断方式相同：设置了 `GH_REPO` 时用它，否则用文件夹的 GitHub 远程仓库。

卡片标题下方显示最多两个标签（其余显示数量）、评论数，以及 PR 指向的不是仓库默认分支时的 `→ 分支`。

没有任何需要你处理的事项时（没有审查请求、没有需要处理的 PR、没有分配给你或提到你的议题），抽屉会在标签页上方显示 `✓ 没有需要你处理的事项`，提示栏上方的那一行保持隐藏。

### 待审查

每个等待你审查的 PR 对应一张卡片，内容包括一句话摘要、PR 的原因、影响范围、规模和作者，以及你的审查已等待多久。有风险的事项（例如 schema 变更或必须遵守的部署顺序）会标记 ⚠️。

- 点击 `审查` 后，卡片会标记为 `已添加`，抽屉保持打开，因此可以连续挑选多个 PR。关闭抽屉（Esc 或 ×）时，每个已添加 PR 的审查请求会放入输入框，并附上该 PR 的警告以及你上次审查后的变更。在你按下 Enter 之前，不会发送任何内容。如果输入框中已有的内容已经请求审查某个 PR，打开抽屉时该 PR 会显示为 `已添加`。
- `隐藏` 会隐藏这张卡片，直到该 PR 有新的提交。
- `已重新请求` 用于标记你已经审查过、又再次请求你审查的 PR，并附上你上次审查后变更内容的简短摘要。
- 卡片分为直接请求、团队请求和草稿三组。

![在两张卡片上点击审查，卡片标记为已添加；点击隐藏隐藏第三张；按 Esc 将两个审查请求放入输入框](docs/images/en/review.gif)

审查请求还会附带一行文字，描述你平时的审查方式，让 Claude 按你的方式进行审查。mod 每周一次读取你最近审查过的最多 30 个 PR 上你本人留下的评论，请 Claude 描述你使用的语言和语气、你最先关注什么，以及你提出要求时的措辞。如果可供学习的评论少于五条，审查请求就不带这一行；如果学习失败，则保留上一次的描述，mod 会在一天后重试。

### 我的 PR

列出你处于打开状态的 PR，显示状态而不是摘要，并按你需要处理的先后排序：请求更改、CI 失败、合并冲突、等待审查（等待最久的在前）、已批准、草稿。正在运行的 CI 会显示在状态旁边。

`隐藏` 会隐藏 PR，直到它的状态改变或有人新提交审查；仅仅你自己推送新提交不会让它重新出现。

![我的 PR：从请求更改到草稿共六个 PR，其中两个有新审查](docs/images/en/my-prs.png)

在你最新一次提交之后提交的审查会显示为 `新审查`，并注明审查者，直到你再次提交为止。批准、请求更改和仅含评论的审查都算在内，讨论串中的回复也算，无论来自人还是机器人；被驳回的审查不算。这样的 PR 会计为待处理事项，并排在同一状态下没有新动态的 PR 之前。不调用模型。

轮到你处理的 PR（请求更改、CI 失败或合并冲突）会有一个下一步按钮：`处理评论`、`修复 CI` 或 `解决冲突`。按钮旁显示 Claude 将要工作的文件夹：当前会话位于该仓库的克隆中时显示 `此文件夹`，有会话曾在该仓库中运行时显示那个文件夹，否则显示 `没有本地克隆`。按钮会像 `审查` 一样添加卡片。关闭抽屉时，请求会写明这一步以及读取评论或失败日志的 `gh` 命令，并要求 Claude 在新的 worktree 中工作，不动那个文件夹的分支。没有已知文件夹时，Claude 会问你克隆在哪里，或建议 `gh repo clone` 并等你同意。不会增加 GitHub 调用，也不调用模型。

### 我的议题

列出分配给你的打开状态的议题，以及提及你的打开状态的议题和 PR；同时符合两者的条目只显示一次，归为“分配给我”。下方列出最近 30 天内引用了你的议题或 PR 的其他议题和 PR，并注明引用者。你自己做出的引用不包括在内，且只显示最新的 20 条。不调用模型。

条目分为分配、提及和引用三组。`隐藏` 会隐藏条目，直到它有新的动态。

![我的议题：分配给你的议题、提及你的内容，以及别处对你工作的引用](docs/images/en/my-issues.png)

分配给你的议题会有一个工作方式相同的 `开始处理` 按钮：Claude 会阅读议题、规划改动，并在新 worktree 的新分支上开始。

### 通知

以下情况会弹出通知：新的审查请求；你的某个 PR 收到新审查；你的某个 PR 变为请求更改、CI 失败或合并冲突；新的分配、提及或引用。会话第一次读取列表时不发出任何通知。多条通知同时到达时会依次显示，间隔 4.5 秒。

你的 PR 获得批准且没有正在运行的 CI 时，会提示一次 `可以合并`。

![输入框下方依次出现三条通知：新的审查请求、你的 PR 被请求更改、新的提及](docs/images/en/toasts.gif)

### 卡片按钮

点击卡片上的 `▸ 更多` 会打开一排按钮，每个按钮都会带着预设的请求把卡片交给 Claude：审查请求上有 `总结风险`、`解释改动` 和 `起草批准评论`，你的 PR 上有 `起草给审查者的回复` 和 `调查 CI 失败`。按钮会像 `审查` 一样添加卡片，关闭抽屉时请求会进入你的输入框。在你按 Enter 之前，不会运行或发布任何内容。

可以在缓存文件夹的 `actions.json` 中添加自己的按钮。抽屉底部的 `▸ 编辑按钮` 会显示它的路径，`添加按钮` 会让 Claude 和你一起写一个。

```json
{
  "buttons": [
    { "id": "test-plan", "name": "测试计划", "scope": "review", "prompt": "在 {{.RepoPath}} 中为 {{.PrUrl}} 写一份测试计划。" },
    { "id": "draft-approval", "scope": "review", "hidden": true }
  ]
}
```

`scope` 是 `review`、`pr` 或 `issue`。prompt 中可以像 gh-dash 一样以 `{{.Name}}`, `{{Name}}`, `{{ .Name }}` 的形式使用 `RepoName`, `RepoPath`, `PrNumber`, `PrUrl`, `PrTitle`, `Author`, `HeadRefName`, `BaseRefName`, `IssueNumber`, `IssueTitle`, `IssueUrl`；卡片没有值的变量会留空。与内置按钮 id 相同的按钮会替换它，`"hidden": true` 会移除它。缺少字段、scope 或变量名未知的条目会被跳过，并在 `编辑按钮` 下列出原因；其余按钮照常工作。`PrTitle` 和 `Author` 原样来自 GitHub，所以使用它们的 prompt 会把别人写的文字交给 Claude。

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

## 语言

横条、抽屉、通知、放入输入框的审查请求，以及模型生成的摘要和审查风格描述，都使用同一种语言。

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

mod 只通过你自己的 `gh` 访问 GitHub；它把 PR 文本发给 Claude 以生成摘要，并每周一次把你本人的审查评论发给 Claude 以描述你的风格；它只写入自己的缓存文件夹。下面逐项列出它涉及的内容及原因，与 `claude plugin validate .` 为该 mod 列出的内容一致。

[![reach](https://raw.githubusercontent.com/karanb192/awesome-claude-code-mods/main/badges/SummerRiversound--review-inbox--review-inbox-reach.svg)](https://mods.aidojo.si/#SummerRiversound--review-inbox--review-inbox)

- **运行 `gh`**：用 `gh api graphql` 获取列表，并每周一次获取你最近的审查评论；对已重新请求的 PR 运行 `gh api repos/<owner>/<repo>/compare/<from>...<to>`；设置了 `githubUser` 时运行 `gh auth token -u <githubUser>`。除此之外，mod 自身不发起任何网络调用。
- **运行 `git`**：每 30 秒在会话文件夹中运行 `git branch --show-current` 和 `git remote -v`，以找到位于你的 PR 分支上的会话；并运行 `git rev-parse --path-format=absolute --git-common-dir`，以记住该仓库的主文件夹。
- **请求 Claude**（`sonnet` 模型）生成每条摘要，发送的内容包括 PR 的仓库名、标题、描述（前 12,000 个字符）、变更的文件路径（最多 80 个）和规模；对于已重新请求的 PR，还会发送你上次审查以来每条提交信息的第一行，以及这期间最多 60 个文件路径。这会计入你的 Claude Code 用量。每个 PR 在每个 head 提交、每种语言下只生成一次摘要；生成失败的摘要，每个提交最多尝试三次。此外，mod 每周一次发送你最近审查过的最多 30 个 PR 上你本人的审查评论，每条截取前 500 个字符，最多 60 条、合计不超过 12,000 个字符，用于描述你的审查风格；少于五条时不发送任何内容。
- **写入文件**：只写入其缓存文件夹 `~/.claude/plugins/data/review-inbox`（设置了 `CLAUDE_CONFIG_DIR` 时，用它代替 `~/.claude`）。`inbox-<hash>.json` 保存列表和摘要；`hidden-<hash>.json` 保存已隐藏的 PR；`notes-<hash>.json` 保存备注和推迟（与语言无关，每个账户和范围一个文件）；`sessions.json` 保存每个活动会话的文件夹名、分支、GitHub 远程仓库和提示中出现的 PR 链接（与账户无关，一个文件）； `repos.json` 保存会话运行过的每个 GitHub 仓库的主文件夹（供下一步按钮使用）； `style-<hash>.json` 保存你的审查风格描述。每个文件先写入旁边的临时文件，再用 `mv` 替换，因此其他会话不会读到写了一半的文件；在没有 `mv` 的环境（如 Windows）中则直接写入。如果你创建了 `actions.json`，只会从那里读取，从不写入。
- **读取环境变量**：读取 `CLAUDE_CONFIG_DIR`、`HOME` 和 `USERPROFILE` 来找到该文件夹；像 `gh` 一样读取 `GH_REPO` 来确定当前会话的仓库；只有 `language` 为 `auto` 时才读取 `LC_ALL`、`LC_MESSAGES` 和 `LANG`。不设置任何环境变量。
- **读取 Claude Code 设置**：只有 `language` 为 `auto` 时才读取 `language` 键，只有 `motion` 为 `auto` 时才读取 `prefersReducedMotion` 键。
- **读取并填写输入框**：仅在抽屉打开和关闭时进行。打开抽屉时读取输入框中已有的内容，以标记其中已经请求审查的 PR；关闭抽屉时，把你添加的 PR 的审查请求另起新行，追加到已有内容之后。

## 工作原理

你打开的所有会话共享同一次获取：最多每 10 分钟由一个会话向 GitHub 请求一次，其他会话读取它保存的结果。

每个打开的 Claude Code 会话都会运行该 mod，但同一账号、scope 和语言组合共用一个缓存文件，已隐藏的 PR 也是如此。每个会话每 30 秒读取一次该文件。只有发现文件已超过 10 分钟、并成功完成一次短时认领的会话才会调用 GitHub，因此打开十个会话也只会发出一次请求。负责获取的会话在工作期间会续期认领；3 分钟未续期的认领会被其他会话接管。获取失败时保留上一次成功获取的列表，并在 1 分钟后重试。点击抽屉中的 `↻` 可立即获取。

一次 GraphQL 搜索就能返回所有等待你审查的 PR 及卡片所需的信息，另一个包含三次搜索的请求负责填充“我的 PR”和“我的议题”。引用来自你创建的 PR 和议题上的交叉引用事件。条目被引用时，GitHub 不会更新它的 `updatedAt`，因此 mod 会在最近 60 天内有过更新的条目中查找最近 30 天内的引用，每个请求检查 50 个条目。如果 GitHub 拒绝引用搜索（它对每次查询有资源上限），则保留上一次的引用结果，其他标签页仍照常更新。

`refreshMinutes` 可以修改这 10 分钟。

## 限制

- 等待你审查的 PR 最多 100 个，按 GitHub 的最佳匹配顺序排列。其他标签页最多读取你的 100 个打开状态的 PR、100 个分配给你的议题和 100 个提及你的议题，以及最多 500 个最近有更新的条目中的引用，均按最新活动在前排序。 超出这些数量时，计数显示为 `100+`。 每个列表每次读取 25 个；GitHub 超时的那一页会以一半的大小重新请求，因此 PR 很多的账号也不会超出 GitHub 的时间限制。
- 如果被引用的条目你已有 60 天没有动过，这条引用会被漏掉。
- PR 有任何新提交时，`新审查` 都会消失，包括通过 GitHub 的“Update branch”按钮或由机器人产生的提交。
- 如果强制推送改写了你审查过的提交，已重新请求的 PR 不会显示“我上次审查后的变更”这一行。
- 你的审查风格是从 GitHub 搜索 `reviewed-by:@me -author:@me` 返回的 PR 中学习的，范围限于 `scope`，因此你在自己创建的 PR 上留下的评论不计入。PR 对话中不属于任何审查的评论不在学习范围内。

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
