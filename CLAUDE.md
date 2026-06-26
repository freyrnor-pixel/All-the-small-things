@AGENTS.md

## Git workflow

- Always create a dedicated branch for new work.
- Group related fixes or features into the same branch rather than splitting into many small branches.
- Before starting new work, check for stale or unmerged branches and flag them.
- **Always create a PR and merge to main** (do not push directly to main):
  - Create a pull request with a clear description of what changed and why.
  - Merge the PR to main once changes are complete.
  - Verify the merge succeeds and CI passes.
- After every new update, double-check that everything works as intended: quick-check for bugs, and see if anything old can/should be deleted.

## Current deployment state

- App version used at this time is Runtime 1.0.0, In Preview.

## Testing policy

- No testing needed until further notice (no Jest runs, no live-app/browser verification).
- Still always do regular checking: manual read-through for bugs/dead code. (TypeScript typecheck via `npx tsc --noEmit` is not available in the remote environment since `node_modules` is not pre-installed.)

## Navigation: BottomNav is current, BubbleMenu is deferred

- `BottomNav` (`components/BottomNav.tsx`) is the app's current, only nav entry point — a box-grid of
  all 11 sites (2 rows: 6 + 5), sourced from `lib/siteNav.ts`'s `SITE_ITEMS`. All sites must stay
  listed there.
- `BubbleMenu` is explicitly **deferred** — do not redesign or fix it unless asked; its known issues
  (see `AGENTS.md`'s merge-risk note) are not being worked on right now.
- Per-site screen swipe navigation (`components/SiteSwipeView.tsx`) and the active-tab "pushed in"
  shading on `BottomNav` are functional-only for now — no colour/material polish yet; that's a later pass.
