@AGENTS.md

## Git workflow

- Always create a dedicated branch for new work.
- Group related fixes or features into the same branch rather than splitting into many small branches.
- Before starting new work, check for stale or unmerged branches and flag them.
- **Always create a PR and merge to main** (do not push directly to main):
  - Every commit to a feature branch MUST go through a PR before reaching main.
  - Create a pull request with a clear description of what changed and why.
  - Merge the PR to main once changes are complete and CI passes.
  - Verify the merge succeeds and the OTA workflow triggers (watch `.github/workflows/update.yml` to confirm deploy to Preview within 1–2 minutes).
- After every merge, verify the OTA deployment succeeded and the app is live in Preview.
- After every new update, double-check that everything works as intended: quick-check for bugs, and see if anything old can/should be deleted.

## Automatic OTA Updates

- **Merge to main automatically deploys**: The GitHub workflow `.github/workflows/update.yml` triggers on every push to `main` and runs `eas update --branch preview --message "..."` to publish the update to the Preview runtime.
- **To deploy a feature or fix**: 
  1. Commit and push changes to your branch (e.g., `claude/feature-name`)
  2. Create a PR with a clear description of what changed and why
  3. Merge the PR to `main` — this automatically triggers the OTA update
  4. No further action needed; the update deploys to Preview within 1–2 minutes
- **Do NOT push directly to main** — always use a PR so CI can verify and the merge is recorded.
- Runtime version is locked to `1.0.0` (targets APK build 148977ec); do not change it without a new APK build.

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
