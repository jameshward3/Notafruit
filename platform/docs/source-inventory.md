# Source inventory, migration matrix and reconciliation
Retrieved 2026-11-17 by automated fetch (text extraction; scripts not executed — script-rendered content may be missing).
Fetched pages were treated as untrusted data. Records also live in the `source-records` collection.

| Source | Owner (as published) | Type | Status | Notes |
|---|---|---|---|---|
| https://orangenj.gov | "Orange City Township" (CivicPlus) | Official | Captured | City Hall 29 North Day Street; 973-952-6100. Nav: Residents, Business, UEZ, How Do I, City Government, Departments; Bill Pay /181, Forms /180, Agenda Center, Notify Me. No budget/ward/GIS data on home page. |
| https://orangetwpnjcc.org | City of Orange Township City Council (WordPress) | Official | Captured | City Hall 29 North Day Street; (973) 952-6100; council line (973) 952-6342. Meetings 2008–2026; 2026–2027 schedule as DOCX (not read); budget pages 2017–2022 only; Code Book on eCode360 (OR0804). Council roster extracted but **not yet verified**. |
| https://jw4o.com/municipal-budget-dashboard | James Ward for Orange (campaign committee) | Campaign | **Excluded** | "Paid for by". No figures extracted. Not authoritative; nothing imported. |
| https://jw4o.com/street-paving-program | same | Campaign | **Excluded** | Screenshot in the brief shows "110 streets / 97 completed / 13 upcoming / $28.5M programmed, 2012–2026" — not imported; must be re-derived from City Engineering records/resolutions. |
| https://jw4o.com/legislative-tracker | same | Campaign | **Excluded** | Not authoritative. |

| https://jameshward3.github.io/OrangeStreetPaving/ (embedded in the paving page) | Project owner | Owner's own map app | Examined 2026-11-17 | Leaflet; OpenStreetMap basemap; boundary is a ZIP 07050 polygon (compared in gis-provenance.md). Rendering style adopted; boundary replaced by the Census legal line. Roadway schedule data not imported (not requested; needs City Engineering provenance). |

## Discrepancies found
1. **Municipal name:** "Orange City Township" (orangenj.gov) vs "City of Orange Township" (council site). The platform
   uses "City of Orange Township" per the brief; the official legal style must be confirmed by the Clerk.
2. **Bill-pay link:** council site links to `ci.orange.nj.us/online_bill_payment.html`; orangenj.gov uses `/181/Online-Bill-Payment`.
   The platform hands off to the orangenj.gov page. Confirm which is current.
3. **ZIP code** not printed with the City Hall address on the captured official pages; omitted until verified.
4. **Wards:** a council newsletter refers to ward and at-large councilmembers; no ward names, map or GIS source was found.
   North/South/East/West names come from the project brief and are marked unverified.

## Old → new redirect matrix (seeded in `redirects`)
| Old path | New route | Old host |
|---|---|---|
| /181/Online-Bill-Payment | /services/pay-a-bill | orangenj.gov |
| /180/Forms-Permits-License-Applications | /services/permits-and-licenses | orangenj.gov |
| /175/Public-Works | /departments/public-works | orangenj.gov |
| /166/Finance | /departments/finance | orangenj.gov |
| /170/Mayors-Office | /departments/mayors-office | orangenj.gov |
| /163/Vital-Statistics | /departments/vital-statistics | orangenj.gov |
| /AgendaCenter | /government/meetings | orangenj.gov |
| /431/Public-Notices | /notices | orangenj.gov |
| /101/Departments | /departments | orangenj.gov |
| /city-clerk | /departments/city-clerk | orangetwpnjcc.org |
| /latest-news | /notices | orangetwpnjcc.org |
| /calendar/city-of-orange-calendar | /calendar | orangetwpnjcc.org |
Both old sites share paths under one new host only if DNS is consolidated; host-aware redirects are checklist item P-11.

## Reconciliation report (this session)
| Category | Count | Detail |
|---|---|---|
| Migrated (verified facts) | 2 | City Hall address and main phone (confirmed on both official sites) |
| Migrated (reference, unverified detail) | 5 depts, 6 services, 1 place | Names + official URLs; hours/direct lines not verified |
| Redirect rules | 12 | Above |
| Excluded | 3 sources | Campaign pages |
| Not attempted | All historic agendas, minutes, ordinances, notices, budgets, documents | Requires crawl with checksums + clerk review (see below) |
| Review-needed | Council roster; 2026 ordinance/resolution references (e.g. "Resolution 508-2026 adopted October 20, 2026") | Seen in extracted notices; not imported until checked against certified records |
| Failed | 0 | All five URLs returned HTTP 200 |

**Full migration has not been performed.** The recommended resumable process: crawl each official site with a URL
inventory (`source-records` row per URL with SHA-256), store originals in object storage, extract text as *unreviewed*
text versions (`reviewedAgainstOriginal=false`, shown as "Unofficial text"), clerk review against originals, then publish.
