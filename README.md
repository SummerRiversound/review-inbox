# Review Inbox

**English** | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [Español](README.es.md) | [Português](README.pt-BR.md) | [Deutsch](README.de.md) | [Français](README.fr.md)

A [Claude Code](https://claude.com/claude-code) mod that keeps your GitHub work in view while you code: the pull requests waiting for your review, each summarized in plain language before you open it, your own open PRs and the reviews they get, and the issues that pull you in.

- **Band above the prompt** — one line counting only what needs you: PRs waiting for your review, your PRs with something to do, and issues assigned to you or mentioning you. Its colour is how long the oldest review request has waited (yellow from 3 days, red from 14). `Open` opens the drawer.
- **Drawer** — `/review-inbox`, with three tabs: To review, My PRs and My issues.
- **Toasts** — a short notice when something new arrives while you work.

![The band above the prompt, then the drawer's three tabs: To review, My PRs and My issues](docs/images/en/overview.gif)

The interface and the summaries come in nine languages; see [Language](#language).

## Tabs

### To review

One card per PR waiting for your review: a one-sentence summary, why the PR exists, what it touches, its size and author, and how long your review has been pending. Risky items, such as a schema change or a required deploy order, are marked ⚠️.

- `Review` marks the card `Added` and keeps the drawer open, so you can pick several PRs. When you close the drawer (Esc or ×), a review request for each added PR goes into your prompt, with its warnings and what changed since your last review. Nothing is sent until you press Enter. A PR your draft already asks for shows as `Added` when the drawer opens.
- `Hide` hides the card until the PR gets a new commit.
- `re-requested` marks a PR you already reviewed that asks for you again, with a short summary of what changed since your last review.
- Direct requests come before team requests. Drafts are listed separately.

![Review on two cards marks them Added, Hide hides a third, and Esc puts both review requests into the prompt](docs/images/en/review.gif)

The request also carries one line describing how you usually review, so Claude reviews the way you would. Once a week the mod reads your own comments on up to 30 PRs you recently reviewed, and asks Claude to describe your language and tone, what you look at first and how you phrase requests. With fewer than five comments to learn from, the request goes without that line; if learning fails, the last description stays and the mod tries again a day later.

### My PRs

Your open PRs with their state instead of a summary, in the order you have to act on them: changes requested, CI failing, merge conflict, waiting for review (oldest first), approved, draft. Running CI is shown next to the state.

![My PRs: six PRs from changes requested to draft, two with a new review](docs/images/en/my-prs.png)

A review submitted after your latest commit shows as `New review` with who left it, until you commit again. That covers approvals, change requests and comment-only reviews, thread replies included, from people or bots; a dismissed review does not count. Such a PR counts as something to do and moves ahead of quiet ones in the same state. No model calls.

### My issues

Open issues assigned to you, and open issues and PRs that mention you; an item that is both shows once, as assigned. Below them, other issues and PRs from the last 30 days that referenced one of yours, with who did it. References you made yourself are left out, and only the newest 20 are shown. No model calls.

![My issues: assigned issues, mentions, and references to your work from elsewhere](docs/images/en/my-issues.png)

### Toasts

A new review request, a new review on one of your PRs, one of your PRs turning to changes requested, CI failing or conflicting, and a new assignment, mention or reference. A session's first look announces nothing. When several arrive at once, they show one after another, 4.5 seconds apart.

![Three toasts in turn below the prompt: a new review request, changes requested on your PR, and a new mention](docs/images/en/toasts.gif)

## Requirements

- Claude Code 2.1.287 or later, the first builds with mods (function-hook plugins). Tested on 2.1.292. Mods are in early access, and their API may change between releases.
- [GitHub CLI](https://cli.github.com/) (`gh`) on your `PATH`, logged in (`gh auth login`) with access to the repositories you review.
- GitHub Enterprise Server: set `GH_HOST` in the environment Claude Code starts in; every `gh` call goes to that host.

## Install

At the prompt of a Claude Code session:

```text
/plugin marketplace add https://github.com/SummerRiversound/review-inbox.git
/plugin install review-inbox@review-inbox
```

The install screen asks for the options below; all of them can stay empty or at their default.

### Update and uninstall

```sh
claude plugin marketplace update review-inbox
claude plugin update review-inbox@review-inbox
claude plugin uninstall review-inbox@review-inbox
```

An update applies after a restart. Uninstalling leaves the mod's cache folder, `~/.claude/plugins/data/review-inbox`, in place; delete it yourself to remove the cached lists and summaries. See the [changelog](CHANGELOG.md) for what each version changed.

## Configuration

Set on the install screen; change them later in `/config`. A change applies right away.

| Option | Default | What it does |
| --- | --- | --- |
| `scope` | empty | GitHub search qualifiers added to every search (`review-requested:@me`, `author:@me`, `assignee:@me`, `mentions:@me`). Empty means all of GitHub. |
| `githubUser` | empty | The `gh` account to use when several are logged in (`gh auth token -u <user>`). Empty uses the active account. |
| `language` | `auto` | `auto`, or one of the codes in [Language](#language). |

`scope` takes anything GitHub's [issue and PR search](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests) accepts:

```text
org:my-org
org:my-org org:other-org
repo:owner/name repo:owner/other
org:my-org -repo:my-org/noisy-repo
user:my-username
```

Repeated `org:`, `repo:` and `user:` qualifiers match any of them. A team review request counts as a request for you, as GitHub's `review-requested:@me` defines it.

## Language

The band, the drawer, the toasts, the review request put into your prompt, and the summaries and review-style description the model writes all use one language.

| Code | Language |
| --- | --- |
| `en` | English |
| `ko` | Korean (한국어) |
| `ja` | Japanese (日本語) |
| `zh-CN` | Simplified Chinese (简体中文) |
| `zh-TW` | Traditional Chinese (繁體中文) |
| `es` | Spanish (Español) |
| `pt-BR` | Brazilian Portuguese (Português do Brasil) |
| `de` | German (Deutsch) |
| `fr` | French (Français) |

- A code picks that language.
- `auto` (the default) follows Claude Code's own `language` setting when it names one of these, by code, English name or its own name (`ja-JP`, `Japanese`, `日本語`). Otherwise it follows the system locale (`LC_ALL`, `LC_MESSAGES`, then `LANG`), and otherwise English. Chinese is read as Simplified unless it is marked as Taiwan, Hong Kong, Macau or Traditional (`zh-TW`, `zh-Hant`, `繁體中文`), and Portuguese as Brazilian.

Summaries and the description of your review style are kept per language, so switching writes each summary, and that description, once more in the new language. Any other language falls back to English.

Languages other than English and Korean were translated with Claude and have not been checked by native speakers yet. Corrections are welcome as an issue or a pull request: each language is one file in [`hooks/locales/`](hooks/locales/), and the English table, which every other table follows, is in [`hooks/i18n.ts`](hooks/i18n.ts).

## What it reads and runs

The mod reaches GitHub only through your own `gh`, sends PR text to Claude to write the summaries and, once a week, your own review comments to describe your style, and writes only to its own cache folder. Below is each thing it touches and why; it matches what `claude plugin validate .` lists for the mod.

- **Runs `gh`**: `gh api graphql` for the lists and, once a week, for your recent review comments; `gh api repos/<owner>/<repo>/compare/<from>...<to>` for a re-requested PR, and `gh auth token -u <githubUser>` when `githubUser` is set. The mod makes no other network calls of its own.
- **Asks Claude** (the `sonnet` model) for each summary, sending a PR's repository name, title, description (first 12,000 characters), changed file paths (up to 80) and size; for a re-requested PR, also the first line of each commit message and up to 60 file paths since your last review. This counts against your Claude Code usage. Each PR is summarized once per head commit and language; a summary that fails is tried at most three times per commit. Once a week it also sends your own review comments on up to 30 PRs you recently reviewed, each cut to 500 characters, at most 60 of them and 12,000 characters in all, to describe your review style; with fewer than five, nothing is sent.
- **Writes files** only in its cache folder, `~/.claude/plugins/data/review-inbox` (`CLAUDE_CONFIG_DIR` takes the place of `~/.claude` when set). `inbox-<hash>.json` holds the lists and summaries; `hidden-<hash>.json` holds hidden PRs; `style-<hash>.json` holds the description of your review style.
- **Reads environment variables**: `CLAUDE_CONFIG_DIR`, `HOME` and `USERPROFILE` to find that folder; `LC_ALL`, `LC_MESSAGES` and `LANG` only when `language` is `auto`. It sets none.
- **Reads Claude Code settings** only when `language` is `auto`, and uses only the `language` key.
- **Reads and fills your prompt** only around the drawer: it reads the draft when the drawer opens, to mark the PRs it already asks for, and when the drawer closes it adds the requests for the PRs you added, on new lines after the draft.

## How it works

All your open sessions share one fetch: one session asks GitHub at most every 10 minutes, and the others read what it saved.

Every open Claude Code session runs the mod, but they share one cache file per account, scope and language, and so do hidden PRs. Each session reads it every 30 seconds. Only the session that finds it older than 10 minutes and wins a short claim calls GitHub, so ten open sessions make one request. The fetching session renews its claim while it works; a claim not renewed for 3 minutes is taken over. A failed fetch keeps the last good lists and is retried after a minute. `↻` in the drawer fetches right away.

One GraphQL search returns every PR waiting for your review with what the cards need, and one more request with three searches fills My PRs and My issues. References come from the cross-reference events on the PRs and issues you authored. GitHub does not update an item's `updatedAt` when something references it, so items touched in the last 60 days are checked for references made in the last 30, 50 items per request. If GitHub refuses the reference search (it has a per-query resource limit), the last references are kept and the other tabs still update.

## Limits

- At most 100 PRs waiting for your review, in GitHub's best-match order. The other tabs read up to 100 of your open PRs, 50 assigned and 50 mentioning issues, and references from up to 500 recently touched items, each newest activity first.
- A reference to an item you have not touched in 60 days is missed.
- `New review` clears on any new commit to the PR, including one made by GitHub's "Update branch" button or by a bot.
- After a force-push that rewrote the commit you reviewed, a re-requested PR shows no "since my last review" line.
- Your review style is learned from the PRs GitHub's search returns for `reviewed-by:@me -author:@me`, within `scope`, so comments on PRs you wrote yourself are left out. Comments in a PR's conversation, outside a review, are not part of it.

## Troubleshooting

- **The drawer shows a `gh` error.** Run `gh auth status`. With several accounts logged in, set `githubUser`. The mod retries every minute.
- **The band does not appear.** It shows only when something needs you; zeros are left out.
- **The language is not the one you expected.** Set `language` to a language code in `/config` instead of `auto`.
- **Something else.** Start Claude Code with `claude --debug`; lines from this mod begin with `review-inbox:`.

## Development

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin validate` and `claude plugin test` need no login, and CI runs both on the tested Claude Code build. `tsconfig.json` extends `.claude-plugin/types/tsconfig.json`, which Claude Code writes (and `.gitignore` excludes) the first time it loads the mod from this folder, so run `claude --plugin-dir .` once before type-checking with `tsc -p .`.

## License

[MIT](LICENSE)
