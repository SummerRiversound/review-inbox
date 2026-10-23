# Changelog

All notable changes to this mod. Versions follow `version` in `.claude-plugin/plugin.json`; installed copies update when it changes.

## 0.9.0 — 2026-10-23

### Added

- A Searches tab: named GitHub searches, each a section with its total and its 20 newest matches. Three are built in, as in GitHub's pull request inbox (open PRs that involve you, PRs you reviewed that are still open, your open issues); add your own under `groups` in `actions.json`, and count one in the band with `countInBand`.
- An Activity tab: the GitHub notifications no other tab covers, such as comments, state changes, team mentions and security alerts. `Done` and `Unsubscribe` act on GitHub after a 10-second Undo.
- A `●` before a card updated since you last closed the drawer.
- My PRs shows `In merge queue` for a PR in a merge queue, after approved; the band does not count it.

## 0.8.2 — 2026-10-23

### Fixed

- Every GitHub search reads its results 25 at a time, up to the same limits as before 0.8.1 (100 per list, past it `100+`), and a page GitHub times out on is asked again at half the size. My PRs no longer stops at 30.

## 0.8.1 — 2026-10-23

### Fixed

- On an account with many open PRs, every sync failed with `invalid character '<'`: the tab searches together outran GitHub's time limit. Each search now goes out on its own, My PRs reads 30 at a time, and a GitHub timeout says to narrow the `scope` setting.

## 0.8.0 — 2026-10-23

### Added

- Cards from the session's repository (`GH_REPO`, else the folder's GitHub remotes) come first in every group, tagged `this repo`. When the tabs mix repositories, `This repo N` and `All N` above the tabs narrow them to it or show everything; the band still counts everything.
- Each card shows up to two labels and how many more, its comment count and, for a PR, `→ base` when it targets a branch other than the default.
- Your PR turning approved with no CI running toasts `Ready to merge` once.
- A band count that goes down shows in green for a moment. With nothing needing you, the drawer says `✓ Nothing needs you` above the tabs.
- `▸ More` on a card opens a row of buttons that hand it to Claude with a ready-made request: `Summarize risks`, `Explain this diff` and `Draft approval comment` on review requests, `Draft reply to reviewer` and `Investigate CI failure` on your PRs. Add your own, or replace and hide the built-ins, in `actions.json` in the cache folder, with gh-dash style `{{.Name}}` templates. `▸ Edit buttons` shows the file's path and every entry left out with its reason, and `Add button` asks Claude to write one with you.
- New options: `refreshMinutes` (5 to 60, default 10), `repoPaths` (`owner/repo=path` or `owner/*=path/*`, which wins over the folders the mod remembers) and `motion` (`auto` or `off`; `auto` also follows Claude Code's `prefersReducedMotion`).

## 0.7.1 — 2026-10-23

### Fixed

- Refreshes work again. Since 0.6.1 every refresh failed, so the drawer showed an error and kept its last lists: the To review search did not ask GitHub whether a next page exists, which the refresh reads to show `100+`.

## 0.7.0 — 2026-10-23

### Added

- A PR stuck on you gets a button for its next step: `Address comments`, `Fix CI` or `Resolve conflict`. An issue assigned to you gets `Work on this`. Like `Review`, the button adds the card; closing the drawer puts a request in the prompt that names the step, the `gh` commands that read the comments or failing logs, and the folder to work in, in a new worktree that leaves that folder's branch alone.
- The card shows that folder: `this folder` when the session holds a clone of the repository, the main folder of the last session that ran in it, or `no local clone`, in which case Claude asks where the clone is or offers `gh repo clone` and waits for your yes.
- Every 30 seconds each session also runs `git rev-parse --path-format=absolute --git-common-dir` and records its repositories' main folder in `repos.json` in the cache folder, written only when a folder changes.

## 0.6.1 — 2026-10-22

### Fixed

- My issues no longer stop at 50: assigned and mentioning issues are read 100 at a time, as To review and My PRs already were. When a tab has more than one page, its count in the band and the tab title reads `100+`, or `N+` once hidden and snoozed cards are left out.

## 0.6.0 — 2026-10-20

### Added

- Cards one of your sessions is working on gather under `In progress in a session` at the top of To review and My PRs, with the session's folder name or `this session`. My PR counts when a session's folder is checked out on its branch; any card counts once a prompt in that session links to it, as `Review` does. A session that closes, or stays silent for 10 minutes, lets its cards go back.
- Every 30 seconds each session runs `git branch --show-current` and `git remote -v` in its folder and writes the result to `sessions.json` in the cache folder.

## 0.5.0 — 2026-10-20

### Added

- `Note` on every card writes one line above its title, such as what you checked or what you agreed to do and when. `Clear` removes it.
- `Snooze until tomorrow` and `Snooze until next week` hide a card until 9 a.m. the next day or the next Monday. It comes back sooner on the same news that ends a hide, and a toast shows its note when it does. `N hidden · show all` also ends the current tab's snoozes.
- A search field above the tabs finds cards in every tab, hidden and snoozed ones included, by repository, number, title, author, summary, note and the first 2,000 characters of the description. The Claude mobile app has no text field, so search and `Note` are left out there; notes still show.

## 0.4.0 — 2026-10-20

### Added

- `Hide` on My PRs and My issues. A hidden PR shows again when it turns to another state or someone reviews it after the hide; your own push alone does not bring it back. A hidden issue shows again when it has new activity.
- Every tab groups its cards under headers that fold and open with a press: direct requests, team requests and drafts on To review; one group per state on My PRs; assigned, mentions and references on My issues.

### Changed

- My issues lists assigned issues and mentions in separate groups instead of one list.
- Hidden PRs and issues leave the tab and band counts, and `N hidden · show all` brings back only the current tab's cards.

## 0.3.1 — 2026-10-13

### Fixed

- The inbox no longer stays empty after its cache file is left half written, for example when the machine shuts down mid-write. A file that still cannot be read 10 seconds after it was written is fetched again and replaced, including one an earlier version left broken.
- Cache files are written to a temporary file beside them and moved into place with `mv`, so a session never reads half of one. Where there is no `mv`, as on Windows, they are written in place as before.

## 0.3.0 — 2026-10-07

### Added

- The review request carries one line describing how you usually review — language and tone, what you look at first, how you phrase requests — so Claude reviews the way you would. It is learned once a week from your own comments on up to 30 PRs you recently reviewed, and left out when there are fewer than five comments.
- Screenshots and recordings in the README, and the README in all nine languages.

### Changed

- `Review` keeps the drawer open and marks the card `Added`, so you can pick several PRs. Closing the drawer (Esc or ×) puts a review request for each added PR into the prompt at once, never the same PR twice.
- The review request no longer repeats the PR's summary; it keeps the warnings and what changed since your last review.
- Toasts that arrive together show one after another, 4.5 seconds apart, instead of only the last one.

## 0.2.0 — 2026-10-07

### Added

- `language` option: `auto`, or one of nine languages — English (`en`), Korean (`ko`), Japanese (`ja`), Simplified Chinese (`zh-CN`), Traditional Chinese (`zh-TW`), Spanish (`es`), Brazilian Portuguese (`pt-BR`), German (`de`) and French (`fr`). The band, drawer, toasts, the review request put into the prompt and the model-written summaries all follow it. `auto` follows Claude Code's `language` setting, then the system locale, then English.
- The interface and summaries in every language above; Korean was the only one before.
- CI: `claude plugin validate --strict` and `claude plugin test` on the tested Claude Code build.

### Changed

- The default language is now `auto`. A setup stays in Korean when its Claude Code `language` setting names Korean, or when that setting names none of the nine languages and the system locale is Korean; otherwise it switches to the language found, or to English. Set `language` to `ko` to keep Korean regardless.
- Summaries and hidden PRs are kept per language. After updating, every PR waiting for your review is summarized once more, and PRs hidden before the update show again until you hide them.

## 0.1.0 — 2026-10-07

### Added

- Band above the prompt counting what needs you, and the `/review-inbox` drawer.
- To review: PRs waiting for your review, each with a summary, why the PR exists and what it touches; re-requested PRs say what changed since your last review; `Review` and `Hide`.
- My PRs: your open PRs in the order you have to act on them, with new reviews (bots and thread replies included) since your latest commit.
- My issues: issues assigned to you, issues and PRs mentioning you, and references to your work from elsewhere in the last 30 days.
- Toasts for new review requests, new reviews and state changes on your PRs, and new assignments, mentions and references.
- `scope` and `githubUser` options.
