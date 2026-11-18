# Production dependency checklist (release blockers marked ●)
| # | Item | Owner | Status |
|---|---|---|---|
| P-1 ● | Project-owner authorization to publish; official content sign-off by Clerk/departments | City | Open |
| P-2 | Official seal | Clerk | Partly done: official-website PNG in use with project-owner authorization; vector master + Clerk confirmation for production |
| P-3 ● | Verified ward geometry from a custodian (municipal boundary done: U.S. Census Bureau) | Engineering/County GIS | Open — ward lookup disabled |
| P-4 ● | Real content migration: agendas, minutes, legislation, notices, budgets with checksums + clerk review | Clerk/Finance | Not started |
| P-5 ● | IdP app registration + identity-aware proxy (`AUTH_MODE=proxy`), MFA policy, staff accounts and roles | IT | Open |
| P-6 ● | Mail provider credentials, SPF/DKIM/DMARC for sending domain | IT | Open |
| P-7 | Error monitoring + log shipping | IT | Open |
| P-8 ● | Production basemap provider (prototype uses OpenStreetMap's tile servers, which forbid heavy use); geocoder network access | IT | Open |
| P-9 | CDN with purge-on-publish (optional) | IT | Open |
| P-10 ● | Licensed, location-verified photography | Communications | Open |
| P-11 | DNS plan for orangenj.gov + orangetwpnjcc.org; host-aware redirects | IT | Open |
| P-12 ● | Privacy policy and accessibility statement adopted by the City; independent accessibility audit | City | Open |
| P-13 | Spanish translations by a qualified translator | Communications | Open |
| P-14 | Decide ClerkOS ↔ platform sync for meetings/legislation | Clerk/IT | Open |
| P-15 | Payment/permit vendors confirmed as the current systems (hand-off URLs) | Finance/Construction | Open |
| P-16 | Upload malware scanning (ClamAV sidecar) before media approval | IT | Open (types/size restricted only) |
| P-17 | CSP nonces to remove `'unsafe-inline'` scripts | Dev | Open |
| P-18 | Build and run the Docker images; staging deployment; offsite backups + object-storage restore drill | IT | Open (Docker unavailable here) |
