# Paseo look

The Paseo plugin's inbox, picked on 2026-11-28 from three mockups (open cards as in the mod, folding rows, a list with a detail screen): folding rows, the mod's review and My work tabs drawn as Paseo draws its own panels. Tokens and components are in `paseo/DESIGN.md`.

## Rules

1. One line per pull request or issue: where it is from, its name and one line of summary, with the waiting days or state on the right. A press opens that row alone and the tab remembers it.
2. The mod's order and words inside an open row: summary, why, impact with risks marked, author and size, the auto review line, then the buttons.
3. The mod's colours by meaning: a request waiting 3 days turns warning, 14 days danger; my PR's state word takes its colour; drafts stay muted.
4. Paseo's way of drawing a panel: bordered rounded groups on surface colours, muted second lines, tags flush right, chevrons on what folds. Theme keys only.
5. No terminal marks: no bracket buttons, no coloured bar at the left edge, no full URLs printed in the text.
6. Buttons fill the agent's prompt and leave sending to the person. The GitHub link sits at the right edge, so a narrow panel keeps the text buttons on one line.
7. The sidebar row counts direct and team requests, coloured by the oldest wait, and opens the full screen. New requests are announced once: a device notice on Paseo 0.18 or later, a toast before it.
8. Touch targets reach 44 points on phones and narrow windows.
