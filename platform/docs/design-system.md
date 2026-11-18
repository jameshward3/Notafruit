# Design system
Contract: [Orange_Agentic_Style_Guide.md](Orange_Agentic_Style_Guide.md) · status: [style-guide-conformance.md](style-guide-conformance.md)

Tokens: `src/styles/tokens.css` (exact values from the brief). Components: `src/styles/site.css`, `src/components/*`.

- **Color:** navy `#0B2035` primary; brass gold `#B79B59` accent only (never small text on white — gold text uses
  `#70551F`). Status colors always paired with text in `StatusBadge`. Ward colors paired with a distinct marker shape in
  `WardChip` (square/circle/diamond/hollow). Budget category colors are fixed in `src/lib/budget.ts` and never re-mapped
  per year. Orange is not used.
- **Type:** Inter (self-hosted) → Arial. Fluid sizes: hero 36–56, H1 32–44, H2 26–32, H3 21–22, body 18, UI 16, meta 14.
  Tabular numerals for figures.
- **Space/layout:** 4/8/12/16/24/32/48/64/96; max width 1440; gutters 16/32/48 at <640/640/1024; corners 0–4px
  (pills only for status badges); controls 48px; minimum touch target 44px.
- **Shell:** prototype banner → masthead (text wordmark, Español/Accessibility/Search utility, six-item nav,
  disclosure menu < 1024px) → `<main id="main">` → navy footer.
- **Components:** `PageBand`, `Breadcrumbs`, `Notice` (info/warning/emergency/success), `DemoFlag`, `StatusBadge`,
  `WardChip`, `Empty`, `CivicMap` (+ list alternative), `StackedYears`/`SimpleBars` (+ tables), `WardLookup`,
  `ConcernForm`, `SubscribeForm`, tabs, agenda disclosure, timeline, facts list, filters bar.
- **Charts:** horizontal bars, zero baseline; years = rows, categories = additive segments; HTML legend in fixed order;
  every chart followed by an equivalent table and a text summary; missing values display "Not available".
- **Maps:** project status groups (guide §6): planning navy dashed; scheduled gold dashed; active teal solid + work
  symbol; complete navy solid + check symbol; paused gray dotted. Places: filled (City) vs hollow (other agency). Ward
  fills only from verified geometry; otherwise an "Illustrative map" banner. Mobile shows the list first.
- **Focus:** 3px #005FCC outline, 3px offset; on navy a gold outline with a white inner ring; forced-colors uses system colors.
