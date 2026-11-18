# Style-guide conformance — `Orange_Agentic_Style_Guide.md` v1.0
Reviewed 2026-11-17 after the guide was supplied. ✅ met · ◐ partly met / documented exception · ⛔ blocked on an external input.

| § | Requirement | Status | Where / evidence |
|---|---|---|---|
| 1 | Conflict order; mockups not facts; source inventory; no campaign content | ✅ | docs/source-inventory.md; jw4o.com excluded |
| 2 | Official seal in masthead lockup (80/48px) | ✅ | Official orangenj.gov file, unmodified, authorized by project owner; seal + divider + text; e2e checks size and checksum. Vector master pending (P-2) |
| 2 | Home link name "City of Orange Township home" | ✅ | Masthead; e2e `§2 home link` |
| 2 | Real, verified Orange photography; hero eager; AVIF/WebP + fallback; width/height; decorative = empty alt | ◐ | Pipeline done (AVIF+WebP derivatives, original preserved, `<picture>`, eager hero, decorative flag). No photos supplied (P-10) — placeholder states "Photography pending" |
| 2 | Asset manifest fields incl. approvedBy/At, checksum, verificationStatus separate from approval | ✅ | `media` collection; int test `media asset manifest` |
| 3 | Exact color tokens; guide token names | ✅ | `tokens.css` (values + §11 names) |
| 3 | Verify all actual fg/bg pairs | ✅ | `tests/unit/contrast.spec.ts` (31 pairs) |
| 3 | Ward colors constant; navy on fills; selection = outline + text | ✅ | `WardChip`, explore selection; ward colors never used for project status |
| 4 | Inter self-hosted; weights/line-heights per table; eyebrow 0.12em; tabular numerals | ✅ | `site.css` |
| 4 | Header ≈112px desktop; compact 72–88px mobile with accessible menu | ✅ | e2e `§4 mobile header` (measured); Escape closes and returns focus |
| 4 | Focus 3px/3px offset; white inner + gold outer on navy | ✅ | e2e `§4 focus ring` |
| 4 | 12/8/4-column grid | ◐ | Auto-fit grids with the guide's breakpoints/gutters rather than explicit 12/8/4 column classes |
| 5 | Five page blueprints | ✅ | Home, explore (layers, ward selector, selected-ward panel), projects, budget (+ capital by location), meetings |
| 6 | No unverified ward geometry; illustrative label when unverified | ✅ | Banner on all maps; ward layer disabled with explanation; e2e `§6` |
| 6 | Project styles: planning navy dashed, scheduled gold dashed, active teal solid + work symbol, complete navy solid + check | ✅ | `lib/projectStatus.ts`, legend; status lines ≥3:1 on canvas |
| 6 | Mobile list-first with explicit map toggle; filters preserved | ✅ | e2e `§6 mobile defaults to the list` |
| 6 | Neutral basemap, attribution; clear municipal outline | ◐ | OpenStreetMap (desaturated) + Census legal boundary with mask, matching the owner's paving map; attribution shown. OSM tiles are prototype-only (P-8) |
| 7 | Charts from data; horizontal bars; years as rows; zero baseline; fixed palette | ✅ | `BudgetChart.tsx` |
| 7 | Color not the only encoding; tooltip via focus/tap | ✅ | Direct segment labels + ordered legend + table; Recharts `accessibilityLayer`; e2e `§7` |
| 7 | Parks color #9A752F label contrast | ◐ | No text color reaches 4.5:1 on it; labels there render as large bold text (≥3:1). Tested. |
| 7 | Dataset provenance: source, period, updated, verification, dictionary, corrections | ✅ | Budget header line, dataset pages, data dictionary |
| 8 | Seasonal fields (window, priority, wards, department, source); emergency outranks; America/New_York; DST tested | ✅ | `seasonal-features`, `selectHomepage`, unit tests |
| 9 | WCAG 2.1 AA baseline, 2.2 AA target, DOJ references, no overlay, counsel confirms timing | ✅ | Accessibility statement |
| 9 | Test 200% zoom, 320px reflow, keyboard, reduced motion, forced colors | ✅ | e2e (forced colors via rendered system colors; axe contrast rule misreads under emulation) |
| 9 | Representative screen readers | ⛔ | Not performed (no AT in this environment) — required before launch |
| 10 | Content types, workflow, roles, audit, versions, rollback, backups/restore | ✅ | See permission-matrix.md, test-results.md |
| 10 | Previews | ✅ | `/preview/<collection>/<id>`: staff session required, user's own access rules, no-store, noindex; e2e `§10` |
| 10 | Link checks | ✅ | Daily `checkLinks` job, SSRF-guarded (`lib/linkcheck.ts`), report in **Administration → Link checks** |
| 10 | Warnings about incomplete sources | ✅ | Sidebar "Before publishing" panel on every workflow item |
| 10 | MFA | ◐ | Via IdP behind identity-aware proxy (`AUTH_MODE=proxy`), not exercised against a real IdP; local dev login has no MFA |
| 13 | Ward lookup tested against verified addresses in each ward | ⛔ | Requires official geometry (P-3); logic tested with synthetic verified polygons |
