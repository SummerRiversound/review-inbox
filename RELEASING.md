# Releasing

A release is not done until all four steps are:

1. Open a PR titled `chore: release X.Y.Z` that bumps `version` in `.claude-plugin/plugin.json` and adds a `## X.Y.Z — YYYY-MM-DD` entry at the top of `CHANGELOG.md`, then merge it. If the release changes what the shared inbox file holds or how it is fetched, raise `INBOX_FORMAT` in `hooks/inbox.ts` in the same PR, so sessions still on the older release keep to their own file.
2. Create the GitHub release on that merge commit, with the changelog entry as its notes:
   `gh release create vX.Y.Z --repo SummerRiversound/review-inbox --target <merge sha> --title vX.Y.Z --notes-file <the entry>`
3. `claude plugin marketplace update review-inbox`
4. `claude plugin update review-inbox@review-inbox`, which applies after a restart.

## Pictures in the README

The pictures are recordings and screenshots of the drawer, and nothing in the repo makes them: when the drawer's wording, a button or a tab changes, re-record by hand. A release that changes what a picture shows (a button name, a tab, a label the README text also names) is not ready until the picture matches.

Before step 1:

1. List what each picture must show. The caption and the text around it name the buttons and labels (`Review with Claude`, `Added`, `Hide`); every one of them has to be on screen in the picture.
2. Look at the pictures you did not touch. Cut a GIF into one frame a second and read the frames, since a GIF's first frame says little about the last ones:
   `ffmpeg -i docs/images/en/review.gif -vf fps=1 <folder>/%02d.png`
3. Re-record what differs, at the same 1280 px width as the others (about 25 frames a second for a GIF), with the invented organization the pictures already use and never a real repository or person.
4. Replace the file in `docs/images/en` and its twin in `docs/images/ko`. `README.ko.md` points at `ko`; the other eight READMEs point at `en`, so a picture changed only in one folder leaves the other READMEs stale.
5. Put the new files in the same PR as the change that made them stale, or in the release PR.
