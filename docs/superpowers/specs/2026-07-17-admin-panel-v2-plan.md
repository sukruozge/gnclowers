# Admin Panel v2 — Plan (approved 2026-07-17)

Decisions: **polish existing vanilla** `public/admin/dashboard.html` (no Astro rewrite);
first delivery = **Phase 0 cleanup + Phase 1 product editor** together.
Design per ui-ux-pro-max + frontend-design: function-first, calm warm-neutral system,
8px rhythm, semantic status colors, accessible (aria, focus-trap, esc), `esc()` everywhere.

Constraints: static HTML; saves = GitHub commit = full rebuild (~1–2 min) → **bulk ops = one commit**.
Upload body cap 512KB. Etsy nightly sync must preserve panel-edited fields (images/tags/options/variants/priceUsd).

## Milestone A — Phase 0 (truth & cleanup)
- Remove fake furniture: "Concept Mock" chart, fake messages dropdown, dead "Hızlı Uygulamalar",
  non-functional topbar search, ghost Etsy-API/quick-key/sync-status JS, hard-coded `aselovers2024` fallback pass.
- Fix lying persistence: İçerik/Yorumlar/Şifre localStorage-only → remove or wire real (defer real wiring; hide/mark).
- Real dashboard: Ciro / Kargolanacak / Okunmamış mesaj / Yeni abone KPIs + working revenue bars
  (renderer exists; add missing `#ochart` target or reuse on dashboard).
- Kill undefined `--cream/--ink/--forest` vars; `esc()` on all innerHTML interpolations.

## Milestone B — Phase 1 API + sync
- Extend `ProductInput` + `normalizeProduct` (admin API) to accept & persist `images[]`, `tags[]`,
  `options[]`, `variants[]` (validated: variant.values keys ⊆ options names/values). Preserve across
  toggle/optimistic PUTs. Add `priceUsd`/`images`/`tags`/`options`/`variants` to etsy-sync merge preservation
  (options/variants/images already come from Etsy; ensure manual edits win).

## Milestone C — Phase 1 product editor UI
- Image gallery manager: thumb grid, set-primary, reorder, add URL + upload (reuse endpoint), delete.
- Variant/option table: per-variant price inputs; guard base-price/variant desync.
- Tags chip input. USD price column + custom-vs-auto indicator + quick-set. Validation (price bounds,
  image preview, unsaved-changes guard, per-field errors).

## Milestone D — Phase 1 list upgrades
- Column sort, category/price/variant/featured filters, multi-select + single-commit bulk
  (activate/deactivate/category/delete), duplicate product; fix inline category select to persist via PUT;
  delete dead localStorage override system.

## Phase 2 (later) — e-commerce
Orders search + CSV export + expose `note`; notification polling + unread badge; per-day analytics buckets.
