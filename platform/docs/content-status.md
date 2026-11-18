# Content status — verified vs. demo
- **Verified (two official sources):** City Hall address and main phone.
- **Captured, unverified detail:** department names and official page links; service hand-off links; ward names (from brief).
- **Demo (labeled "Sample"/"Illustrative" everywhere they appear, `verificationStatus='demo'`):** all meetings, legislation
  (identifiers prefixed "DEMO"), votes (members "Member A (sample)"…), projects and their geometry, budget datasets,
  notices, seasonal feature, event, and three sample places. Demo records are also flagged in search results, CSV
  (`ILLUSTRATIVE`) and the ICS feed (`[SAMPLE]`). Load without demo: `pnpm seed:demo --no-demo`.
- **Spanish:** interface strings are a first draft pending review by a qualified translator. No page content is
  translated yet; Spanish mode shows English content with an explicit notice.
