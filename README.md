# review-inbox

A [Claude Code](https://claude.com/claude-code) mod that keeps the GitHub pull requests waiting for your review in view, each one summarized in plain language before you open it.

- **Band above the prompt** — one line: how many PRs wait for you and how many days the oldest has waited (yellow from 3 days, red from 14). `열기` opens the drawer.
- **Drawer** (`/review-inbox`) — one card per PR: a one-sentence summary, why the PR exists, what it touches (risky items such as schema changes or deploy-order constraints marked ⚠️), size, author and how long your review has been pending.
  - `리뷰하기` puts a review request for that PR into your prompt, with the summary and the warnings attached.
  - `숨기기` hides the card until the PR gets a new commit.
  - `재요청` marks a PR you already submitted a review on that asks for you again, with a short summary of what changed since your last review.
  - Direct requests are listed before team requests; drafts are listed separately.
- **Toasts** for review requests that arrive while you work.

> **Language:** the interface and the generated summaries are in Korean. The summary rules are plain English prompts in `hooks/inbox.ts` (`SUMMARY_RULES`, `SINCE_RULES`) if you want to change the output language.

## Requirements

- Claude Code with function-hook plugins (mods) — tested on 2.1.292. The plugin API is in early access and may change between releases.
- [GitHub CLI](https://cli.github.com/) (`gh`) on your `PATH`, logged in (`gh auth login`) with access to the repositories you review. If it is not logged in, the drawer shows `gh`'s error and retries every minute.
- GitHub Enterprise Server: set `GH_HOST` in the environment Claude Code starts in; every `gh` call goes to that host.
- Summaries use `$.model.complete` with the `sonnet` model and count against your Claude Code usage. Each PR is summarized once per head commit.

## Install

At the prompt of a Claude Code terminal session:

```text
/plugin install review-inbox --marketplace SummerRiversound/review-inbox
```

Answer `y` to add the marketplace, then choose a scope. If adding the marketplace fails, add it by URL and install from it:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

## Configuration

Both options are set on the install screen and can be changed later in the config menu.

| Option | Default | What it does |
| --- | --- | --- |
| `scope` | empty | GitHub search qualifiers added to `is:pr is:open review-requested:@me`. Empty means every PR on GitHub that requests your review. |
| `githubUser` | empty | The `gh` account to use when several are logged in (`gh auth token -u <user>`). Empty uses the active account. |

`scope` examples — anything GitHub's [issue and PR search](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) accepts:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Repeated `org:`, `repo:` and `user:` qualifiers match any of them. A team review request counts as a request for you, as GitHub's `review-requested:@me` defines it. At most 100 PRs are fetched, in GitHub's default (best match) order.

## How it works

Every open Claude Code session runs the mod, but they share one cache file per account and scope in `~/.claude/plugins/data/review-inbox` (under `CLAUDE_CONFIG_DIR` when that is set). Each session reads the file every 30 seconds; only the session that finds it older than 10 minutes and wins a short claim calls GitHub, so ten open sessions make one request. The fetching session renews its claim while it works; a claim not renewed for 3 minutes is taken over. A failed fetch keeps the last good list and is retried after a minute.

One GraphQL search (`gh api graphql`) returns every PR with what the cards need. For a re-requested PR, the commits and files since your last review come from `gh api repos/<owner>/<repo>/compare`. Hidden PRs are stored next to it, also per account and scope.

PR titles, descriptions and file lists are sent to the model to write the summaries.

## Development

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`tsconfig.json` extends `.claude-plugin/types/tsconfig.json`, which Claude Code writes (and `.gitignore` excludes) the first time it loads the mod from this folder, so run `claude --plugin-dir .` once before type-checking in an editor.

## 한국어 안내

내 리뷰를 기다리는 GitHub PR을 Claude Code 안에서 보여 주는 모드예요. 입력창 위 한 줄에 대기 건수와 가장 오래 기다린 날짜를, `/review-inbox` 서랍에 PR마다 요약·PR 이유·영향 범위를 쉬운 한국어로 보여 줘요. `리뷰하기`를 누르면 입력창에 리뷰 요청 문장이 채워지고, `숨기기`는 새 커밋이 올라올 때까지 카드를 숨겨요.

`gh`에 로그인돼 있어야 하고, 설치 후 `scope`에 `org:회사조직`이나 `repo:owner/name` 같은 검색 조건을 넣으면 그 범위만 봐요. 비워 두면 GitHub 전체에서 나에게 온 리뷰 요청을 모두 보여 줘요.

## License

[MIT](LICENSE)
