# ASN Nigeria

ASN Nigeria publishes Nigerian-coded Internet number allocations and assignments from AFRINIC daily delegated statistics. An Autonomous System Number (ASN) identifies an autonomous routing system. RIPE NCC records are not collected while its public-service terms may apply to the FTP statistics.

## What the records mean

The AFRINIC source selects records whose registered country code is `NG` and whose status is `allocated` or `assigned`. The shared RIR format says that the country code is where the resource holder is legally based; it cannot reliably locate where an IP is used. These lists are registry-allocation coverage, not a physical geolocation database and not a snapshot of prefixes currently announced in BGP. An ASN associated with Nigeria does not mean all its addresses are physically in Nigeria.

The 2026-10-18 cross-RIR live check found active NG-coded records in both AFRINIC and RIPE NCC, and zero in the APNIC, ARIN, and LACNIC snapshots at that time. The collector uses AFRINIC only; it does not collect RIPE NCC, APNIC, ARIN, or LACNIC. These dated observations are not a completeness guarantee.

## Generated files

The public AFRINIC-derived files live under `data/` and are updated by GitHub Actions after validation. RIPE NCC-derived files are not included in any automated output while the applicability of its public-services restriction to FTP statistics remains unresolved. Synthetic RIPE fixtures remain in tests so the generic parser and cross-source validation logic can be checked without fetching or publishing RIPE data.

- `ASN.Nigeria.list` and `asns.txt` contain allocated or assigned ASN identifiers.
- `IPv4.Nigeria.list` contains exact CIDR blocks converted from IPv4 start/count ranges.
- `IPv6.Nigeria.list` contains validated, aligned IPv6 prefixes.
- `IP.Nigeria.list` combines the IPv4 and IPv6 lists. It does not merge adjacent or overlapping blocks.
- `networks.json` contains ASN records with `name: null` and AFRINIC source claims.
- `resources.json` contains IPv4 and IPv6 records with AFRINIC source claims.
- `metadata.json` stores the source URL, source serial, source record count, documentation URL, terms URL, attribution, and terms status. Cross-registry duplicate/conflict/overlap fields remain zero or empty for this AFRINIC-only output; synthetic tests exercise the generic cross-source validator.
- `surge/` contains Surge `IP-CIDR`, `IP-CIDR6`, and `IP-ASN` rules without a policy.
- `quantumult-x/` contains Quantumult X `ip-cidr`, `ip6-cidr`, and `ip-asn` rules, with `direct` as the policy. Change that policy to one configured in your profile if needed.

The generic validator supports multiple registry claims for synthetic testing. Identical records from separate registries produce one output rule while structured records retain both claims; conflicts and partial overlaps are recorded without changing prefix coverage. For the current AFRINIC-only public collection, same-registry conflicting claims fail validation, and exact duplicates are removed.

## Collect locally

Requirements: Node.js 20 or newer and npm. In Windows PowerShell, from the project directory:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` fetches AFRINIC's extended delegated-statistics file with a 30-second timeout, checks HTTP status and format counts, selects active `NG` records, validates resource values, and renders outputs only after validation. The parser and validator also accept synthetic RIPE records in tests; the live RIPE adapter was removed because the current RIPE NCC terms may restrict downloading and compiling statistics-service data. If a fetch or validation fails, existing output is preserved. If replacement fails mid-run, the collector tries to restore changed files; rollback is best-effort and not crash-atomic. When resource lists are unchanged, those files are not rewritten; changed source serials can update provenance metadata alone. Unknown extension columns fail closed until reviewed.

The GitHub Actions workflow runs after pushes to `main`, daily, and on manual dispatch to `main`. It runs tests, typecheck, and build before fetching AFRINIC data. It commits generated files only when one or more resource lists change; metadata-only changes are not committed. Updates are daily snapshots, not real time.

## Sources, terms, and licensing

### AFRINIC

The [AFRINIC extended-statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) says in its **Conditions of Use** that the files are "freely available for download and use" on the condition AFRINIC is not held liable for loss or damage from report information. It does not expressly discuss redistribution of transformed proxy lists or automated publication. At your direction, the project publishes an attributed AFRINIC-derived dataset based on that broad download-and-use wording; this is the project's interpretation, not official confirmation or a statement of legal certainty. The README and [RIR exchange format](https://ftp.afrinic.net/stats/afrinic/RIR-Statistics-Exchange-Format.txt) describe daily files and automated fetching, but that does not resolve transformed redistribution. The source attribution and disclaimer wording are stored in `data/metadata.json`. AFRINIC lists `techops@afrinic.net` for questions about these statistics. No message has been sent.

AFRINIC's [WHOIS Terms of Use](https://web10.mba.afrinic.net/terms-2) separately restrict reuse of the WHOIS database. This collector reads the delegated statistics file, not WHOIS; it does not assume that the WHOIS restrictions automatically govern the statistics file. AFRINIC's README also says the source does not authoritatively identify where an address is currently used.

### RIPE NCC

The [RIPE NCC statistics directory README](https://ftp.ripe.net/pub/stats/ripencc/_README-ripe-stats.txt) identifies the statistics files and directs questions to `swbugs@ripe.net`; it states no redistribution permission. RIPE NCC's [Website and Publicly Available Services Terms of Service](https://www.ripe.net/about-us/legal/terms-of-service/) applies to publicly available services and at Article 3.5 prohibits repackaging, downloading, compiling, redistributing, or reusing data from covered services unless permitted as part of their use. The terms define services to include delivery by protocols, which could cover the FTP statistics, but the statistics README does not state whether it does. The [copyright statement](https://www.ripe.net/about-us/legal/copyright-statement/) also limits reuse of covered material without prior written authorization. Because the restriction may apply and there is no statistics-specific permission, RIPE NCC records are excluded from collection and publication pending clarification. These conditions are separate from AFRINIC's notice.

### Other registries and routes

The shared [RIR exchange specification](https://ftp.ripe.net/pub/stats/ripencc/RIR-Statistics-Exchange-Format.txt) identifies participating registries and defines daily snapshots. The latest official statistics files for [APNIC](https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest), [ARIN](https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest), [LACNIC](https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest), and [RIPE NCC](https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest) were checked separately. AFRINIC is included; RIPE NCC, APNIC, ARIN, and LACNIC are not collected. Their source terms must be reviewed before adding them.

For announced routes, [RIPE RIS](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/) and [RouteViews](https://api.routeviews.org/docs/) are possible documented sources, but terms for publishing derived route lists have not been established here. Route data and registry allocations have distinct meanings and must not be combined as if interchangeable.

The [MIT license](LICENSE) applies only to original code in this repository. It does not license upstream registry data. Public AFRINIC-derived files retain source attribution and the no-liability disclaimer; the project does not state that AFRINIC has confirmed redistribution permission. RIPE-derived data is not collected or published.

## Difference from ASN-China

The [ASN-China](https://github.com/missuo/ASN-China) project is the inspiration for the country-specific ASN/IP-list goal and advertises daily updates. ASN Nigeria is an original TypeScript implementation with public AFRINIC allocation snapshots, exact IPv4 conversion, IPv6 validation, source-level provenance, and separate Surge and Quantumult X formats. It is not fully equivalent: coverage excludes RIPE NCC and the other three RIR datasets, source records do not include network names, and BGP-announced routes are not collected. Registry allocations and BGP routes have different meanings and remain separate.

Surge syntax is checked against its official [IP rule documentation](https://manual.nssurge.com/rules/ip.html). Quantumult X output follows examples in the [official sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf), which uses distinct lowercase `ip-cidr`, `ip6-cidr`, and `ip-asn` rules with an explicit policy.
