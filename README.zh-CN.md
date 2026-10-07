# Review Inbox

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | **简体中文** | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

一个 [Claude Code](https://claude.com/claude-code) mod，让你在写代码时随时看到自己在 GitHub 上的工作：等待你审查的 pull request（每个都会在你打开之前先用通俗的语言做好摘要）、你自己处于打开状态的 PR 及其收到的审查，以及需要你参与的议题。

- **输入框上方的横条**：只用一行统计需要你处理的内容，包括等待你审查的 PR、你的 PR 中有待处理事项的，以及分配给你或提及你的议题。横条的颜色表示最早的审查请求已经等了多久（满 3 天变黄，满 14 天变红）。点击 `打开` 可打开抽屉。
- **抽屉**：使用 `/review-inbox` 打开，有三个标签页：待审查、我的 PR 和我的议题。
- **通知**：工作时有新内容到达，会弹出一条简短的提示。

![输入框上方的横条，随后是抽屉的三个标签页：待审查、我的 PR 和我的议题](docs/images/en/overview.gif)

界面和摘要支持九种语言，详见[语言](#语言)。

## 标签页

### 待审查

每个等待你审查的 PR 对应一张卡片，内容包括一句话摘要、PR 的原因、影响范围、规模和作者，以及你的审查已等待多久。有风险的事项（例如 schema 变更或必须遵守的部署顺序）会标记 ⚠️。

- 点击 `审查` 后，卡片会标记为 `已添加`，抽屉保持打开，因此可以连续挑选多个 PR。关闭抽屉（Esc 或 ×）时，每个已添加 PR 的审查请求会放入输入框，并附上该 PR 的警告以及你上次审查后的变更。在你按下 Enter 之前，不会发送任何内容。如果输入框中已有的内容已经请求审查某个 PR，打开抽屉时该 PR 会显示为 `已添加`。
- `隐藏` 会隐藏这张卡片，直到该 PR 有新的提交。
- `已重新请求` 用于标记你已经审查过、又再次请求你审查的 PR，并附上你上次审查后变更内容的简短摘要。
- 直接请求排在团队请求之前。草稿单独列出。

![在两张卡片上点击审查，卡片标记为已添加；点击隐藏隐藏第三张；按 Esc 将两个审查请求放入输入框](docs/images/en/review.gif)

审查请求还会附带一行文字，描述你平时的审查方式，让 Claude 按你的方式进行审查。mod 每周一次读取你最近审查过的最多 30 个 PR 上你本人留下的评论，请 Claude 描述你使用的语言和语气、你最先关注什么，以及你提出要求时的措辞。如果可供学习的评论少于五条，审查请求就不带这一行；如果学习失败，则保留上一次的描述，mod 会在一天后重试。

### 我的 PR

列出你处于打开状态的 PR，显示状态而不是摘要，并按你需要处理的先后排序：请求更改、CI 失败、合并冲突、等待审查（等待最久的在前）、已批准、草稿。正在运行的 CI 会显示在状态旁边。

![我的 PR：从请求更改到草稿共六个 PR，其中两个有新审查](docs/images/en/my-prs.png)

在你最新一次提交之后提交的审查会显示为 `新审查`，并注明审查者，直到你再次提交为止。批准、请求更改和仅含评论的审查都算在内，讨论串中的回复也算，无论来自人还是机器人；被驳回的审查不算。这样的 PR 会计为待处理事项，并排在同一状态下没有新动态的 PR 之前。不调用模型。

### 我的议题

列出分配给你的打开状态的议题，以及提及你的打开状态的议题和 PR；同时符合两者的条目只显示一次，归为“分配给我”。下方列出最近 30 天内引用了你的议题或 PR 的其他议题和 PR，并注明引用者。你自己做出的引用不包括在内，且只显示最新的 20 条。不调用模型。

![我的议题：分配给你的议题、提及你的内容，以及别处对你工作的引用](docs/images/en/my-issues.png)

### 通知

以下情况会弹出通知：新的审查请求；你的某个 PR 收到新审查；你的某个 PR 变为请求更改、CI 失败或合并冲突；新的分配、提及或引用。会话第一次读取列表时不发出任何通知。多条通知同时到达时会依次显示，间隔 4.5 秒。

![输入框下方依次出现三条通知：新的审查请求、你的 PR 被请求更改、新的提及](docs/images/en/toasts.gif)

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

`scope` 可以填写 GitHub [议题和 PR 搜索](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)支持的任何内容：

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

重复使用 `org:`、`repo:` 和 `user:` 限定符时，匹配其中任意一个即可。按照 GitHub 对 `review-requested:@me` 的定义，向团队发出的审查请求也算作对你的请求。

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

- **运行 `gh`**：用 `gh api graphql` 获取列表，并每周一次获取你最近的审查评论；对已重新请求的 PR 运行 `gh api repos/<owner>/<repo>/compare/<from>...<to>`；设置了 `githubUser` 时运行 `gh auth token -u <githubUser>`。除此之外，mod 自身不发起任何网络调用。
- **请求 Claude**（`sonnet` 模型）生成每条摘要，发送的内容包括 PR 的仓库名、标题、描述（前 12,000 个字符）、变更的文件路径（最多 80 个）和规模；对于已重新请求的 PR，还会发送你上次审查以来每条提交信息的第一行，以及这期间最多 60 个文件路径。这会计入你的 Claude Code 用量。每个 PR 在每个 head 提交、每种语言下只生成一次摘要；生成失败的摘要，每个提交最多尝试三次。此外，mod 每周一次发送你最近审查过的最多 30 个 PR 上你本人的审查评论，每条截取前 500 个字符，最多 60 条、合计不超过 12,000 个字符，用于描述你的审查风格；少于五条时不发送任何内容。
- **写入文件**：只写入其缓存文件夹 `~/.claude/plugins/data/review-inbox`（设置了 `CLAUDE_CONFIG_DIR` 时，用它代替 `~/.claude`）。`inbox-<hash>.json` 保存列表和摘要；`hidden-<hash>.json` 保存已隐藏的 PR；`style-<hash>.json` 保存你的审查风格描述。
- **读取环境变量**：读取 `CLAUDE_CONFIG_DIR`、`HOME` 和 `USERPROFILE` 以找到该文件夹；仅在 `language` 为 `auto` 时读取 `LC_ALL`、`LC_MESSAGES` 和 `LANG`。不设置任何环境变量。
- **读取 Claude Code 设置**：仅在 `language` 为 `auto` 时读取，且只使用 `language` 键。
- **读取并填写输入框**：仅在抽屉打开和关闭时进行。打开抽屉时读取输入框中已有的内容，以标记其中已经请求审查的 PR；关闭抽屉时，把你添加的 PR 的审查请求另起新行，追加到已有内容之后。

## 工作原理

你打开的所有会话共享同一次获取：最多每 10 分钟由一个会话向 GitHub 请求一次，其他会话读取它保存的结果。

每个打开的 Claude Code 会话都会运行该 mod，但同一账号、scope 和语言组合共用一个缓存文件，已隐藏的 PR 也是如此。每个会话每 30 秒读取一次该文件。只有发现文件已超过 10 分钟、并成功完成一次短时认领的会话才会调用 GitHub，因此打开十个会话也只会发出一次请求。负责获取的会话在工作期间会续期认领；3 分钟未续期的认领会被其他会话接管。获取失败时保留上一次成功获取的列表，并在 1 分钟后重试。点击抽屉中的 `↻` 可立即获取。

一次 GraphQL 搜索就能返回所有等待你审查的 PR 及卡片所需的信息，另一个包含三次搜索的请求负责填充“我的 PR”和“我的议题”。引用来自你创建的 PR 和议题上的交叉引用事件。条目被引用时，GitHub 不会更新它的 `updatedAt`，因此 mod 会在最近 60 天内有过更新的条目中查找最近 30 天内的引用，每个请求检查 50 个条目。如果 GitHub 拒绝引用搜索（它对每次查询有资源上限），则保留上一次的引用结果，其他标签页仍照常更新。

## 限制

- 等待你审查的 PR 最多 100 个，按 GitHub 的最佳匹配顺序排列。其他标签页最多读取你的 100 个打开状态的 PR、50 个分配给你的议题和 50 个提及你的议题，以及最多 500 个最近有更新的条目中的引用，均按最新活动在前排序。
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

## 许可证

[MIT](LICENSE)
