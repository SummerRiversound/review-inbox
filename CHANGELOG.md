# Changelog

All notable changes to this mod. Versions follow `version` in `.claude-plugin/plugin.json`; installed copies update when it changes.

## 0.21.0 — 2026-10-28

### Changed

- A posted auto review names each severity in the mod's language, as the card does (`블로커`, `메이저`, `마이너`, `nit` in Korean), instead of always in English.
- Findings that go into the review body because they are outside the diff are grouped under their severity, most severe first, and each one's file and line come after its text instead of before it.

## 0.20.0 — 2026-10-28

### Added

- Auto reviews run in the session where the `Auto review` switch was turned on, and the warning before it says so. `/review-inbox auto-review-here` moves them to the current session, and `/review-inbox auto-review-anywhere` lets any session start them. While the review session is closed, queued PRs wait and their cards say so.

## 0.19.0 — 2026-10-28

### Changed

- The auto review wait counts from the time of the PR's latest commit, so a PR whose last commit is older than `autoReviewSettleMinutes` starts as soon as it is seen. Without a readable commit time it counts from when the inbox first saw the head, as before. The shared inbox file holds the commit time, so sessions still on an older release keep to their own file.

## 0.18.0 — 2026-10-28

### Added

- `autoReviewSettleMinutes`, `30` by default: how long a PR's head commit must stay unchanged before auto review starts on it. It takes 0, 10, 30, 60 or 120; `0` starts as soon as the head is seen, and an unreadable value keeps 30.

## 0.17.1 — 2026-10-28

### Fixed

- Once pressed, the `Auto review` switch alone turns auto review on and off; `autoReview` is only where it starts. A later change in the settings no longer wins over the switch, and the setup request leaves `autoReview` out.

## 0.17.0 — 2026-10-28

### Added

- `autoReviewVerify`, `off` by default: with it `on`, a second reviewer checks each finding of an auto review's draft against the code before it is stored, dropping what does not hold and lowering what is overstated, then sets the verdict again. A draft with no findings skips the check; one with findings costs about twice the tokens, and the card shows both runs' tokens together.

## 0.16.0 — 2026-10-28

### Added

- `autoReviewInstructions`: your own words to the auto reviewer, such as what to check first or how to word comments.
- `autoReviewPost`: what a finished auto review becomes. `pending` (the default) keeps it as your pending review; `comment` posts it as a comment; `verdict` posts it with the verdict it suggests, approve and request changes included. A post GitHub refuses stays pending on the card.
- A setup request for auto review: the first time the `Auto review` button turns it on, and whenever you run `/review-inbox auto-review-config`, the prompt gets each auto review setting with what it does, what it takes, its default and its value now, for Claude to go through with you.
- An `Auto review done` group right below the `Auto review` button gathers the cards with a stored auto review; `Check all` on its row sends them back to their request groups.

### Fixed

- The auto reviewer finds the PR's diff wherever it starts: its task names the run folder's files by full path. A reviewer that still cannot read the diff fails the run instead of storing a review that says so.

## 0.15.3 — 2026-10-27

### Changed

- The warning before the `Auto review` switch turns auto review on is two lines: that each PR it reviews runs a subagent that uses more tokens, and that the details are set in `/config`.

## 0.15.2 — 2026-10-27

### Changed

- The `Auto review` switch atop the To review tab asks before it turns auto review on: what it costs, the daily limit, that your 👀 is visible to the PR's author, and whether large PRs and requests already waiting are included. Turning it off needs no asking.
- The toast when auto review turns on or off only says so.

## 0.15.1 — 2026-10-27

### Added

- An `Auto review` button atop the To review tab turns auto review on or off for all your sessions. A later change to `autoReview` in `/config` wins over it.
- `autoReviewLarge` and `autoReviewBacklog`, both `on` by default. Set either to `off` to leave PRs over 50 files or 2,000 changed lines, or requests made before auto review was on, to you.

### Changed

- PRs over the size limits and requests from before auto review was on are now reviewed too, within `autoReviewDaily`. Drafts and PRs opened by bots are still skipped.
- The `Run auto review` button is gone from cards; `Try again` and `Review again` stay.

## 0.15.0 — 2026-10-27

### Added

- Auto review, off by default (`autoReview`). A PR that asks for your review directly is reviewed in the background by a read-only subagent, one at a time, once its head commit has been still for 30 minutes, and the result is kept on GitHub as your pending review. The card shows the suggested verdict, the findings by severity and what the review cost. **It uses noticeably more tokens**: each review reads the diff and the code with your CLAUDE.md, hooks and the skills you list. While a review runs, your 👀 on the PR keeps your other machines from reviewing it too; one an hour old, left by a machine that stopped, is taken over.
- `Post as comment`, `Post and approve` and `Post and request changes` submit that pending review after a confirm on the card, `Discard` deletes it, `Open on GitHub` opens it for editing, and `Refine in session` asks Claude to work on it with you. The review reaches the author only when you press one.
- `autoReviewModel` (`sonnet` or `opus`), `autoReviewDaily` (reviews started a day, default 5, or `unlimited`) and `autoReviewSkills` (skills loaded into the reviewer). Requests made before you turned it on, and PRs over 50 files or 2,000 lines, wait for `Run auto review`.
- A review stops when the PR gets a new commit, is closed or merged, or stops asking for you. A rebase that changes no content moves your pending review to the new commit with no model call; other new commits leave it in place and the card offers `Review again`.

### Changed

- The shared inbox file moves to format 3, as cards now record whether a bot opened the PR. Sessions on 0.14 and earlier keep their own file until they update.

## 0.14.2 — 2026-10-27

### Fixed

- The review-style line in review requests no longer tells Claude to open with praise. The weekly description leaves out greetings, thanks, praise and how comments are laid out, and a style learned under the older description is learned again on the next refresh, with no style line until then.

## 0.14.1 — 2026-10-26

### Fixed

- A plugin that draws above the prompt beneath this one, such as next-steps' suggested prompts, shows again while the band has a count; the band takes its own row above it.

## 0.14.0 — 2026-10-26

### Changed

- A refresh fills the drawer list by list as GitHub answers, instead of all at once when the last search is back. The review-request search runs alongside the others, and references are read 100 at a time, which halved their time on a busy account.
- A refresh that fails partway keeps the lists it did get, beside the error.

## 0.13.0 — 2026-10-26

### Added

- `Reload them all` beside the older-session warning makes every other session on an older release run `/reload-plugins` by itself, once it is idle; its other plugins reload with it. Only sessions on 0.13.0 or later can answer, so older ones still need `/reload-plugins` typed there once.

## 0.12.1 — 2026-10-23

### Changed

- Tab names no longer start with their key number, so the only number on a tab is its count. The keys 1 to 5 still switch tabs, counting from the left.

## 0.12.0 — 2026-10-23

### Added

- Finished GitHub Actions runs you started show in the Notifications tab as `CI run`, linked to the repository's Actions page. GitHub sends them only while Actions notifications are on for GitHub, under Notifications → System → Actions in your GitHub settings.
- The drawer names other live sessions still on an older release, such as `2 sessions on an older version (dhub2): run /reload-plugins there`.
- Number keys 1 to 5 switch tabs while the drawer has focus; each tab's name starts with its key, and a divider separates the lists to act on from the ones to browse.

### Changed

- Tabs are named for what they hold: My issues is now Assigned & mentioned, Searches is Saved searches, and Activity is Notifications. Saved searches shows no count, and Notifications counts only the unread.
- Notifications are grouped into a section per reason (Comment, State changed, CI run and so on), each foldable.
- `Review` is now `Review with Claude`, and a card's `▸ More` menu is `▸ Actions`.
- Sessions on an older release no longer share the inbox file with newer ones, so their errors (such as `data.search.pageInfo.hasNextPage` from 0.8) no longer show in up-to-date sessions. The first open after updating fetches the lists and review summaries again.

## 0.11.1 — 2026-10-23

### Fixed

- In a narrow drawer, a card's top and bottom rows no longer break mid-word. When both sides do not fit, the right-hand part (age and request type, or `▸ More` and `Review`) moves to its own line in one piece.
- In a narrow drawer, tabs that do not fit move to the next line instead of being cut off.

## 0.11.0 — 2026-10-23

### Added

- One toast when a session opens that sums up what changed while no session was open, such as `While you were away · CI failing 2 · New review on my PR 1`. Before, a new session announced nothing.
- `/review-inbox buttons` shows where `actions.json` is, what it holds and each entry left out with its reason. `/review-inbox add-button` and `/review-inbox add-search` put a request into your prompt for Claude to write one with you.

### Changed

- `Note` and `Hide` moved into each card's `▸ More` row, so a card shows only its main button.
- The `▸ Edit buttons` line at the bottom of the drawer is gone. The drawer shows warnings there only when `actions.json` has an entry left out or too many buttons.

## 0.10.0 — 2026-10-23

### Added

- Direct GitHub actions, off unless the new `directActions` option is `on`. `Approve`, `Ready for review` and `Update branch` (shown only when the base branch has moved ahead) ask on the card first, naming what will be sent and as whom, and are not sent if the PR got new commits since you looked. `Rerun failed CI` and `Assign me` go at once, `Assign me` with an Undo.
- A `Merge` button on your approved PR with no checks running. It adds a request to your prompt to check the repository's merge methods and run `gh pr merge`; nothing merges until you send it.

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
