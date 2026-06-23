# UnFocus design/QA handoff — status

Tracks progress against the original design-session handoff doc
(`unfocus_claude_code_handoff.txt`). Updated 2026-06-23.

## Done

- **1A** Button system unified (Radius.md, 4 variants, opacity-based disabled) —
  fixed across shopping.tsx, health.tsx, meals.tsx, habit-form.tsx, capture.tsx,
  components/Button.tsx. Suggestion chips now use `orangeLight` instead of mint green.
- **1B** FAB radial menu color fix — already correct (`tintToTheme` at 0.38, `contrastOnAll`).
- **1C** Tree motif — home watermark, section dividers, FAB center icon (already used the asset).
- **1D** Theme swatches — radial-gradient swatches (fake, concentric Views, no new
  dependency) + conic rainbow wheel for the custom theme + hue-only picker
  (`components/GradientSwatch.tsx`, `components/HuePicker.tsx`, `customHue` setting).
  "Lubben Rosa" renamed to "Fluffy Rosa".
- **1E** Top banner — already card-styled (`ConfirmationBanner.tsx`), no change needed.
- **1F** Empty states — `components/EmptyState.tsx`, wired into shopping.tsx and habits.tsx.
  No dedicated "search results empty" state exists because there's no search feature in the app.
- **1G** Settings copy — section headers already use `theme.text`; the one red header
  (Data section) is semantically correct (destructive actions), left as-is.
- **2A** Staging tray / pendingRestock flow — already implemented (`status` field on
  shopping_items: list → staged → in_cart).
- **2B** Duplicate catalog items — seed data already clean; dedup-on-insert guard
  already in `useCatalogStore.recordPurchases()`.
- **2C** Disabled-looking buttons — covered by 1A; none were actually `disabled={true}`
  without a handler, all were just visually wrong.
- **3B** Work-day picker — added to Work Mode settings card.
- **3C** Temporary vs permanent items — already implemented (`isTemporary` field,
  "Midlertidig" toggle/badge, auto-purge on monthly reset).

## Not done

- **3A** Settings restructure into 8 categorized drill-in screens (Profil & konto,
  Utseende & tema, Varsler, Ukeliste & arbeidsuke, Handleliste & månedsliste,
  Helse & vaner, Automatiseringer, Om appen / støtte). Deliberately deferred —
  `app/settings.tsx` is currently 947 lines and this is a large structural change
  (new screens, new routes, moving every existing section's JSX) that can't be
  live-tested in this environment. Do this as its own dedicated session/PR.

## Open questions (per original handoff — decided)

- **Q1** Automatiseringer visibility → hidden from Settings for now (not a near-term feature).
- **Q2** Budget tracking scope → out of scope for this pass, not implemented.
