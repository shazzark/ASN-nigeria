# ASN Nigeria

ASN Nigeria collects Nigerian-coded Internet number allocations and assignments from AFRINIC and RIPE NCC daily delegated statistics. An Autonomous System Number (ASN) identifies an autonomous routing system. These registry files contain ASNs, IPv4 ranges, and IPv6 prefixes, but do not provide network names or observed BGP routes.

## What the records mean

Each source selects records whose registered country code is `NG` and whose status is `allocated` or `assigned`. The shared RIR format says that the country code is where the resource holder is legally based; it cannot reliably locate where an IP is used. These lists are registry-allocation coverage, not a physical geolocation database and not a snapshot of prefixes currently announced in BGP. An ASN associated with Nigeria does not mean all its addresses are physically in Nigeria.

The 2026-10-18 cross-RIR live check found active NG-coded records in AFRINIC and RIPE NCC. It also found zero in the APNIC, ARIN, and LACNIC statistics snapshots at that time. Registry data changes, so this is a dated observation and not a completeness guarantee. The collector currently includes AFRINIC and RIPE NCC only.

## Generated files

Files are generated locally under `data/` and ignored by Git while redistribution terms remain unresolved:

- `ASN.Nigeria.list` and `asns.txt` contain allocated or assigned ASN identifiers.
- `IPv4.Nigeria.list` contains exact CIDR blocks converted from IPv4 start/count ranges.
- `IPv6.Nigeria.list` contains validated, aligned IPv6 prefixes.
- `IP.Nigeria.list` combines the IPv4 and IPv6 lists. It does not merge adjacent or overlapping blocks.
- `networks.json` contains ASN records with `name: null` and one or more source claims.
- `resources.json` contains IPv4 and IPv6 records with source claims.
- `metadata.json` stores each source URL, source serial, source record count, documentation URL, terms URL, and terms status separately. It also describes cross-registry duplicates, conflicting metadata for identical resources, and partial prefix overlaps.
- `surge/` contains Surge `IP-CIDR`, `IP-CIDR6`, and `IP-ASN` rules without a policy.
- `quantumult-x/` contains Quantumult X `ip-cidr`, `ip6-cidr`, and `ip-asn` rules, with `direct` as the policy. Change that policy to one configured in your profile if needed.

Identical ASN numbers or CIDR blocks claimed by both registries produce one output rule while structured records retain both claims. Opaque holder IDs are meaningful only within their source registry. If cross-registry claims for the same resource disagree on date or status, metadata records the conflict. Partial overlapping prefixes are retained as separate exact prefixes and reported; the collector does not broaden, subtract, coalesce, or silently choose one registry's claim. Conflicting duplicate records within the same registry fail validation.

## Collect locally

Requirements: Node.js 20 or newer and npm. In Windows PowerShell, from the project directory:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` fetches the AFRINIC and RIPE NCC extended delegated-statistics files with a 30-second timeout, checks HTTP status and format counts, selects active `NG` records, validates resource values, and renders outputs only after both sources validate. Some RIPE `reserved`/`available` rows have no country, date, or holder ID; the parser accepts that documented inactive-row form but never selects it as an NG allocation. If either fetch or validation fails, existing output is preserved. If replacement fails mid-run, the collector tries to restore changed files; rollback is best-effort and not crash-atomic. When resource lists are unchanged, those files are not rewritten; changed source serials can update provenance metadata alone. Unknown extension columns fail closed until reviewed.

The GitHub Actions workflow has daily and manual triggers but runs tests, typecheck, and build only. It does not fetch, commit, upload, or publish generated data. Local generation remains available; updates are daily snapshots, not real time. No GitHub workflow run is claimed unless one is observed.

## Sources, terms, and licensing

### AFRINIC

The [AFRINIC extended-statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) says in its **Conditions of Use** that the files are "freely available for download and use" subject to a no-liability condition. This is not an explicit prohibition. The README and linked [RIR exchange format](https://ftp.afrinic.net/stats/afrinic/RIR-Statistics-Exchange-Format.txt) do not expressly answer whether that use includes public redistribution of transformed proxy lists. The exchange format's public-access and persistent-URL instructions describe availability and automated fetching, not a specific redistribution license. AFRINIC lists `techops@afrinic.net` for questions about these statistics. The open question is whether transformed ASN/CIDR lists may be publicly redistributed on GitHub, including automated daily updates, and what attribution or conditions apply. No message has been sent.

AFRINIC's [WHOIS Terms of Use](https://web10.mba.afrinic.net/terms-2) separately restrict reuse of the WHOIS database. This collector reads the delegated statistics file, not WHOIS; it does not assume that the WHOIS restrictions automatically govern the statistics file. AFRINIC's README also says the source does not authoritatively identify where an address is currently used.

### RIPE NCC

The [RIPE NCC statistics directory README](https://ftp.ripe.net/pub/stats/ripencc/_README-ripe-stats.txt) identifies the directory as the statistics exchange files, links to the format specification, and directs questions to `swbugs@ripe.net`; it does not state a data license or redistribution permission. The [RIPE NCC copyright statement](https://www.ripe.net/about-us/legal/copyright-statement/) says covered RIPE NCC materials may not be reproduced or made available to third parties without prior written authorization, subject to stated exceptions. Its public non-commercial exception requires the material to remain unmodified and identified as a RIPE NCC document. The statement defines covered materials as materials on webpages whose domain includes `ripe.net`, so whether it covers FTP-hosted statistics is unclear. The related [Website and Publicly Available Services Terms of Service](https://www.ripe.net/about-us/legal/terms-of-service/) makes the copyright statement part of use of the website and covered services and says at Article 6.2 that RIPE NCC intellectual property may only be made available to third parties with prior written authorisation. It does not expressly establish whether the FTP statistics are within that scope. The statistics README and format specification also do not answer whether transformed public lists are allowed. RIPE-derived public output therefore remains disabled pending clarification. No RIPE data terms are inferred from AFRINIC's different wording.

### Other registries and routes

The shared [RIR exchange specification](https://ftp.ripe.net/pub/stats/ripencc/RIR-Statistics-Exchange-Format.txt) identifies the participating registries and defines daily snapshots. The latest official statistics files for [APNIC](https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest), [ARIN](https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest), [LACNIC](https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest), and [RIPE NCC](https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest) were checked separately. AFRINIC and RIPE NCC are included; the other three are not. Their source terms must be reviewed before adding them.

For announced routes, [RIPE RIS](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/) and [RouteViews](https://api.routeviews.org/docs/) are possible documented sources, but terms for publishing derived route lists have not been established here. Route data and registry allocations have distinct meanings and must not be combined as if interchangeable.

The [MIT license](LICENSE) applies only to original code in this repository. It does not license data from AFRINIC, RIPE NCC, other registries, or generated files derived from them. Generated files remain local until each source's applicable redistribution terms are resolved.

## Difference from ASN-China

The [ASN-China](https://github.com/missuo/ASN-China) project is the inspiration for the country-specific ASN/IP-list goal and advertises daily updates. ASN Nigeria is an original TypeScript implementation with AFRINIC and RIPE NCC allocation snapshots, exact IPv4 conversion, IPv6 validation, source-level provenance, and separate Surge and Quantumult X formats. It is not yet fully equivalent: it covers only two RIR datasets, has no source-provided network names, does not collect BGP-announced routes, and does not publicly publish data or automated daily outputs while source redistribution terms remain unresolved.
