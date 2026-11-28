---
version: alpha
name: review-inbox for Paseo
description: The review inbox as folding rows in Paseo's Explorer and on its own screen, with a count in the sidebar, drawn with Paseo's own theme so it sits beside Files and Changes as one of them.
colors:
  surface0: "#181b1a"
  surface1: "#1e2120"
  surface2: "#272a29"
  border: "#252b2a"
  foreground: "#e6e8ee"
  foregroundMuted: "#8f96a3"
  accent: "#20744a"
  accentForeground: "#ffffff"
  statusWarning: "#d29922"
  statusSuccess: "#3fb950"
  statusDanger: "#f0726a"
typography:
  name:
    fontFamily: Paseo UI
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: Paseo UI
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  small:
    fontFamily: Paseo UI
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  small-strong:
    fontFamily: Paseo UI
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  group: 10px
  control: 8px
spacing:
  panel: 16px
  panel-compact: 12px
  row: 10px
  gap: 6px
  target: 32px
  target-compact: 44px
components:
  group:
    backgroundColor: "{colors.surface1}"
    textColor: "{colors.foregroundMuted}"
    typography: "{typography.small}"
    rounded: "{rounded.group}"
  row-open:
    backgroundColor: "{colors.surface2}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    padding: "{spacing.row}"
  row-name:
    textColor: "{colors.foreground}"
    typography: "{typography.name}"
  row-where:
    textColor: "{colors.foregroundMuted}"
    typography: "{typography.small}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  approved:
    textColor: "{colors.statusSuccess}"
    typography: "{typography.small-strong}"
  tab-on:
    backgroundColor: "{colors.surface2}"
    textColor: "{colors.foreground}"
    typography: "{typography.small-strong}"
    rounded: "{rounded.control}"
    height: "{spacing.target}"
  button-main:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accentForeground}"
    typography: "{typography.small-strong}"
    rounded: "{rounded.control}"
    height: "{spacing.target}"
  button:
    backgroundColor: "{colors.surface0}"
    textColor: "{colors.foreground}"
    typography: "{typography.small}"
    rounded: "{rounded.control}"
    height: "{spacing.target}"
  waiting-long:
    textColor: "{colors.statusWarning}"
    typography: "{typography.small-strong}"
  waiting-too-long:
    textColor: "{colors.statusDanger}"
    typography: "{typography.small-strong}"
  impact-warning:
    textColor: "{colors.statusWarning}"
    typography: "{typography.body}"
  auto-suggestion:
    textColor: "{colors.accent}"
    typography: "{typography.small}"
---

# review-inbox for Paseo

## Overview

The inbox reads like a mail list in a narrow side panel: one line per pull request, the oldest wait in colour, and only the row you press unfolded. It is the mod's review tab and My work tab (variant B, folding rows, picked on 2026-11-28) drawn as Paseo draws its own panels. The rules are in `docs/design-reference/paseo/README.md`.

## Colors

Paseo theme keys only; the hex values above are Paseo's default dark theme as the app drew it on 2026-11-28, shown for reference. Code reads `theme.colors`, so light, dark and plugin themes follow the person's setting.

- **statusWarning:** a request waiting 3 days or more, an impact line marked as a risk, a review running.
- **statusDanger:** a request waiting 14 days or more, my PR with changes asked or CI failing, a failed auto review.
- **statusSuccess:** my PR approved.
- **accent:** the main button on each row and the auto review's suggestion line, the mod's suggestion colour.
- **foreground:** names and summaries; **foregroundMuted:** where a row is from, labels, counts, tabs not chosen.
- **surface0** the panel, **surface1** groups, **surface2** an open row and the chosen tab; **border** group edges and row dividers.

## Typography

Paseo's UI font. Weight marks a row's name, the chosen tab and a wait long enough to colour; nothing is monospaced. The mod's words are kept (n일째, 재요청, 지난 내 리뷰 이후, 임시 리뷰 보기) so the mod and the plugin read the same.

## Layout

One column. A head line (when it was fetched, whether an auto review runs, and the refresh button), two tabs side by side, then the groups. The same view fills the Explorer panel and the full screen; the screen's own header names it, so the view has no title of its own. Buttons and tabs are 32 points high, 44 on phones and narrow windows (`layout.compact`).

## Elevation & Depth

None. Hierarchy comes from groups, the open row's surface and weight, not shadows.

## Components

- **Tabs:** 리뷰 대기 n and 내 작업 n, each a bordered control; the chosen one on surface2.
- **Groups:** a bordered rounded box per kind, headed by its name and count: direct requests, team requests, drafts; my PRs, assigned and mentioned, mentions of my work elsewhere.
- **Row, folded:** where it is from (repo #n, re-request, team) on the left and the tag on the right with a chevron; the name in two lines at most; one line of summary, or of what changed since my last review.
- **Row, open:** on surface2; summary, why and impact with risks in warning colour and a ⚠, then author and size with the GitHub link at the right, the auto review line, and the buttons.
- **Tag:** a review request's waiting days in its age colour; my PR's state word in its colour with its age; an issue's kind with how long ago.
- **Auto review line:** a dot and the mod's wording: waiting to settle, queued, running, the verdict it suggests with the findings by severity and its tokens, or why it failed.
- **Buttons:** the main one first (리뷰하기, or the next task on my PR or issue), then 임시 리뷰 보기 when my pending review exists, then 숨기기; the GitHub link sits at the right edge.
- **Sidebar row:** 리뷰 인박스 with a count badge of the direct and team requests, coloured by the oldest wait; it opens the screen.
- **New request notice:** a device notice on Paseo 0.18 or later, an in-app toast before it; drafts and the first fetch raise none.

## Do's and Don'ts

- Do use Paseo theme keys and Paseo's own parts (Icon, SidebarRow, Loading, toasts); never a literal colour.
- Do fill the agent's prompt and leave sending to the person; never send for them.
- Do show the loading state, the error line or the empty text rather than a count that may be wrong.
- Don't bring the terminal's marks: bracket buttons, the coloured bar at the left edge, full URLs in the text.
- Don't add the Browse tab, the review lock or posting from the card here; they are left for later.
