# Review Inbox

Review Inbox lists the GitHub pull requests waiting for your review, your own open pull requests with what each one needs next, and the issues assigned to you or mentioning you. Each review request comes with a short summary, so you can pick what to review first without opening GitHub.

## What you see

- **The inbox panel.** Open it from the Explorer or the sidebar. The To review tab groups requests asked of you, of your teams, and drafts; the My work tab holds your pull requests, your issues, and places that referenced your work in the last 30 days. Each row shows where it is from, its title, one line of summary, and how long it has waited, in warning colour from 3 days and danger colour from 14. Pressing a row opens its summary, why it was made, its impact with risks marked, and its buttons.
- **Buttons that hand work to your agent.** Review with Claude, Address comments, Fix CI, Resolve conflict and Work on this put a request into the focused agent's composer. Nothing is sent until you send it.
- **A count in the sidebar.** The Review inbox row counts the requests waiting for you, coloured by the oldest wait, and opens the inbox on its own screen.
- **New request notices.** Each new review request is announced once: as a device notice on Paseo 0.18 or later, as an in-app toast before that. Drafts are announced when they become ready.

## How it works

1. Every 10 minutes, or when you press refresh, the plugin reads your lists from GitHub with the `gh` command on the daemon machine.
2. For each review request, Claude Sonnet writes a three-part summary through the `claude` command. When your review is asked again, it also says what changed since your last review.
3. Auto review, when you turn it on, reviews requests asked of you directly, one at a time, once their last commit has settled for the wait you set, up to a daily limit. A Paseo background agent with the provider and model you choose reads the diff and the pull request's description, comments and checks, then the plugin saves its findings as a pending review on GitHub. A pending review is visible only to you until you submit it from GitHub. Drafts, team requests, pull requests opened by bots, and commits you already reviewed are skipped.

## Setup

- GitHub CLI (`gh`) installed on the machine that runs the Paseo daemon and signed in with access to the repositories you review.
- Claude Code installed and signed in on the same machine, as the `claude` command, for the summaries. Without it, rows show their titles only.
- Paseo 0.17.5 or later. Tested on macOS.
- Settings: search scope (GitHub search qualifiers such as `org:my-org`), the `gh` account to read as, auto review on or off, the reviewer's provider and model, reviews per day, the wait after the last commit, and skills for the reviewer to load. Auto review is off by default.

## Data and permissions

- GitHub is read and written with your `gh` sign-in. The only write is auto review's pending review, which is not published.
- Summaries send each pull request's repository, title, size, changed file paths and description to Anthropic through Claude Code under your Claude account, with no tools, none of your Claude Code settings, skills or MCP servers, and no saved session. They are billed to that account.
- An auto review runs as a background agent of the provider you chose, with your own agent setup and tools, in a folder holding the diff, the description, the comments and the checks. That content goes to the provider. Permission requests during the run are refused, and a run stops after 30 minutes. It is billed to the provider account.
- Lists, summaries and auto review state are saved on the daemon machine, in `plugin-data/review-inbox/` inside the daemon's Paseo home (`~/.paseo` by default). Each run folder is removed when its review ends.
- Summaries and reviews follow Claude Code's language setting, then the machine's locale.

## Limitations

- Saved searches and GitHub notifications are not shown yet.
- Lists are at most 10 minutes old unless you refresh.
- Auto review starts one review at a time and posts nothing on its own.
