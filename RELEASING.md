# Releasing

A release is not done until all four steps are:

1. Open a PR titled `chore: release X.Y.Z` that bumps `version` in `.claude-plugin/plugin.json` and adds a `## X.Y.Z — YYYY-MM-DD` entry at the top of `CHANGELOG.md`, then merge it. If the release changes what the shared inbox file holds or how it is fetched, raise `INBOX_FORMAT` in `hooks/inbox.ts` in the same PR, so sessions still on the older release keep to their own file.
2. Create the GitHub release on that merge commit, with the changelog entry as its notes:
   `gh release create vX.Y.Z --repo SummerRiversound/review-inbox --target <merge sha> --title vX.Y.Z --notes-file <the entry>`
3. `claude plugin marketplace update review-inbox`
4. `claude plugin update review-inbox@review-inbox`, which applies after a restart.
