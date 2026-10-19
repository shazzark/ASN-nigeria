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

`npm run update` fetches AFRINIC's extended delegated-statistics file over IPv4 HTTPS with Node's native HTTPS client and default TLS certificate verification. The collector uses IPv4 because GitHub Actions' Node 22 `fetch` failed to connect to the source while both `curl` and Node's native IPv4 HTTPS client succeeded. It applies a 30-second per-attempt timeout and up to three attempts for network errors, HTTP 408, HTTP 429, or server errors, and honors `Retry-After` up to 30 seconds. HTTPS redirects are limited to five same-origin hops; cross-origin redirects and redirects containing credentials are rejected. Responses are limited to 16 MiB. The collector checks HTTP status and format counts, selects active `NG` records, validates resource values, and renders outputs only after validation. Collection requires IPv4 egress to the source on port 443; IPv6-only networks are not supported. The parser and validator also accept synthetic RIPE records in tests; the live RIPE adapter was removed because the current RIPE NCC terms may restrict downloading and compiling statistics-service data. If a fetch or validation fails, existing output is preserved. If replacement fails mid-run, the collector tries to restore changed files; rollback is best-effort and not crash-atomic. When resource lists are unchanged, those files are not rewritten; changed source serials can update provenance metadata alone. Unknown extension columns fail closed until reviewed.

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

## Feature parity with ASN-China

This checklist is based on the current [ASN-China README](https://github.com/missuo/ASN-China), its [`ASN_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/ASN_CN.py), [`IP_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/IP_CN.py), and [daily workflow](https://github.com/missuo/ASN-China/blob/main/.github/workflows/ci.yml), inspected on 2026-10-19. ASN-China's README does not describe its copied IP lists as BGP snapshots, so this comparison does not assume they are.

| Feature | ASN-China currently does | ASN Nigeria | Status |
| --- | --- | --- | --- |
| ASN rules | Scrapes the `#asns` table from `bgp.he.net/country/CN`, including the ASN name in a comment. | Publishes AFRINIC active `NG` allocation/assignment ASNs; network names are `null`. | Core rule output exists; names are an optional descriptive annotation gap. |
| IPv4, IPv6, combined IP files | Copies three ready-made lists from `cbuijs/ipasn` without transformation. | Converts AFRINIC IPv4 allocation ranges exactly to CIDRs and validates IPv6 allocation prefixes; publishes separate and combined lists. | Outputs exist, but dataset meaning and source differ. |
| IP source lineage | README identifies `cbuijs/ipasn`; its README calls itself an “IP to ASN list” and says it updates at least every 24 hours. The reviewed source documentation does not explain country assignment, the generator, or redistribution terms. | AFRINIC registry allocation/assignment records, with per-source metadata. | Not an equivalent source. We do not infer that ASN-China's copied lists are BGP routes or registry allocations. |
| Proxy formats | README shows ASN rule subscriptions for Surge and Quantumult X. | Publishes ASN and IP rule files separately in each client’s syntax. | Present. |
| Scheduled updates | Runs on push, manual dispatch, and daily cron; automatically commits output. | Runs on push to `main`, manual dispatch, and daily cron; validates before collection and commits only when resource lists change. | Present, with stronger validation and no-op handling. |
| Geographic coverage | China ASN/IP lists plus a separate US ASN list. | Nigeria-coded AFRINIC allocations only. | Country focus differs; NG records outside AFRINIC are a known coverage gap. |

The source script [`ASN_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/ASN_CN.py) fetches the HE country page and reads its ASN table. It does not fetch BGP route snapshots. [`IP_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/IP_CN.py) downloads country, IPv4, and IPv6 lists from `cbuijs/ipasn` verbatim. The inspected [`ipasn` README](https://github.com/cbuijs/ipasn) did not establish how those country lists are derived or whether republication is allowed, so ASN Nigeria does not import them. A future equivalent IP dataset needs a documented method and terms that support this use.

### Essential gaps and optional improvements

The essential unresolved gaps are broader NG-coded registry coverage and a separately sourced country-IP dataset with established meaning and terms. The `ipasn` repository does have Nigeria IPv4 and IPv6 list files ([IPv4](https://github.com/cbuijs/ipasn/blob/master/country-africa-nigeria4.list), [IPv6](https://github.com/cbuijs/ipasn/blob/master/country-africa-nigeria6.list)); however, the checked documentation does not establish their country-assignment method or redistribution terms. This is a candidate, not a cleared source. Network names are an additional descriptive parity gap, but are not needed for proxy rules to match ASNs; no terms-cleared name source was verified, so names remain null. The published allocation files remain AFRINIC-only and are not labeled as BGP routes. RIPE NCC’s Article 3.5 contains an explicit reuse restriction for covered public services, but whether it covers its FTP statistics remains unresolved; RIPE data stays excluded. The question is applicability of that restriction, not whether the clause exists.

Optional differences include the extra US ASN output in ASN-China, generated comment headers, and matching its exact list layout. They do not affect the ability to consume the Nigerian rules. To use the published ASN rules:

```ini
# Surge
RULE-SET, https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/surge/ASN.Nigeria.list, DIRECT

# Quantumult X [filter_remote]
https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/quantumult-x/ASN.Nigeria.list, tag=NigeriaASN, force-policy=direct, update-interval=86400, opt-parser=true, enabled=true
```

Replace `ASN.Nigeria.list` with `IPv4.Nigeria.list`, `IPv6.Nigeria.list`, or `IP.Nigeria.list` to use those rule sets. The client-specific files are separate because Surge and Quantumult X use different rule syntax. These subscription URLs update when the daily workflow publishes changed records; they are not real-time feeds.

Surge syntax is checked against its official [IP rule documentation](https://manual.nssurge.com/rules/ip.html). Quantumult X output follows examples in the [official sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf), which uses distinct lowercase `ip-cidr`, `ip6-cidr`, and `ip-asn` rules with an explicit policy.
