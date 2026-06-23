@AGENTS.md

## Git workflow

- Always create a dedicated branch for new work.
- Group related fixes or features into the same branch rather than splitting into many small branches.
- Before starting new work, check for stale or unmerged branches and flag them.
- Always end the session by opening a pull request with a clear description of what changed and why.
- After every new update, double-check that everything works as intended: quick-check for bugs, and see if anything old can/should be deleted.

## Current deployment state

- App version used at this time is Runtime 1.0.0, In Preview.

## Testing policy

- No testing needed until further notice (no Jest runs, no live-app/browser verification).
- Still always do regular checking: TypeScript typecheck (`npx tsc --noEmit`) and a quick read-through for bugs/dead code.

## Navigation: BottomNav is current, BubbleMenu is deferred

- `BottomNav` (`components/BottomNav.tsx`) is the app's current, only nav entry point — a box-grid of
  all 11 sites (2 rows: 6 + 5), sourced from `lib/siteNav.ts`'s `SITE_ITEMS`. All sites must stay
  listed there.
- `BubbleMenu` is explicitly **deferred** — do not redesign or fix it unless asked; its known issues
  (see `AGENTS.md`'s merge-risk note) are not being worked on right now.
- Per-site screen swipe navigation (`components/SiteSwipeView.tsx`) and the active-tab "pushed in"
  shading on `BottomNav` are functional-only for now — no colour/material polish yet; that's a later pass.
