# Progress Log

Per-session summaries, newest at the bottom. Each entry: date, phase, what
was ported/built, any new decisions added to REBUILD_DECISIONS.md, anything
left unresolved.

## 2026-06-30 — Phase 0: Planning files
Created REBUILD_DECISIONS.md (seeded with Decision 001), PROGRESS_LOG.md,
and REBUILD_PLAN.md. No code touched. Next session: Phase 1, foundation /
universal screen scaffold.

## 2026-07-01 — Read-only investigation: C1 (note editing) + E1 (HintCard reach)
Confirmed two backlog items against the real repo. No app code changed.

**C1 — Note editing: result (a) SHIPPED & REACHABLE.** The 2026-06-21
FEATURE_INVENTORY ("no separate Notes page", editing "doesn't exist yet") is
STALE — editing is fully built and wired.
- `app/notes.tsx` exists — Expo Router route `/notes`, a real screen (ScreenHeader,
  active/checked split, NoteRow list, AddFAB, BottomNav).
- `store/useNotesStore.ts` exists, SQLite-backed (owns `notes` table via
  lib/dataAccess), exposes `update(id, patch)` covering BOTH header and body
  (Partial<Note>), plus add/toggleChecked/remove.
- NoteRow is wired in notes.tsx with `onHeaderCommit → updateNote(id,{header})`
  and `onBodyCommit → updateNote(id,{body})` (notes.tsx:74–75); NoteRow fires
  those callbacks on commit only when text changed (NoteRow.tsx:57,61).
- Reachable: Home (`app/index.tsx`) has a Notes preview with a "See all" link
  `goToSite(router, pathname, '/notes')` (index.tsx:608). No BottomNav tab by
  design (lib/siteNav.ts) — reached via the Home preview card. Do NOT add a tab
  as a "fix"; its absence is deliberate.

**E1 — HintCard reach: verdict TWO screens only (not "most").** Import grep
across the whole repo (`import ... HintCard`) returns exactly two consumers:
- `app/scan.tsx:60`
- `app/notes.tsx:36`
Other HintCard matches are its own definition (components/HintCard.tsx), i18n
`hints.*` strings (lib/i18n.ts), theme tokens, and docs — not imports. So the
inventory's "hint boxes at the top of most screens" is NOT reflected in code:
HintCard is currently mounted on only 2 of the screens.

No product decisions made — findings only.
