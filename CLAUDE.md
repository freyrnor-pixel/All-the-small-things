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
