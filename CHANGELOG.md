# Changelog

All notable changes to this mod. Versions follow `version` in `.claude-plugin/plugin.json`; installed copies update when it changes.

## 0.2.0 — 2026-10-07

### Added

- `language` option (`auto`, `en`, `ko`). The band, drawer, toasts, the review request put into the prompt and the model-written summaries all follow it. `auto` follows Claude Code's `language` setting, then the system locale, then English.
- English interface and English summaries.
- CI: `claude plugin validate --strict` and `claude plugin test` on the tested Claude Code build.

### Changed

- The default language is now `auto`. A setup stays in Korean when its Claude Code `language` setting names Korean, or when that setting names neither English nor Korean and the system locale is Korean; everything else switches to English. Set `language` to `ko` to keep Korean regardless.
- Summaries and hidden PRs are kept per language. After updating, every PR waiting for your review is summarized once more, and PRs hidden before the update show again until you hide them.

## 0.1.0 — 2026-10-07

### Added

- Band above the prompt counting what needs you, and the `/review-inbox` drawer.
- To review: PRs waiting for your review, each with a summary, why the PR exists and what it touches; re-requested PRs say what changed since your last review; `Review` and `Hide`.
- My PRs: your open PRs in the order you have to act on them, with new reviews (bots and thread replies included) since your latest commit.
- My issues: issues assigned to you, issues and PRs mentioning you, and references to your work from elsewhere in the last 30 days.
- Toasts for new review requests, new reviews and state changes on your PRs, and new assignments, mentions and references.
- `scope` and `githubUser` options.
