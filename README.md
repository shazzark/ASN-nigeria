# ASN Nigeria

ASN Nigeria collects two different kinds of Nigeria-related Internet data: AFRINIC, APNIC, ARIN, and LACNIC registry allocations and assignments, plus DB-IP Lite country-geolocation classifications. They are published in separate directories because their country labels mean different things.

An Autonomous System Number (ASN) identifies an autonomous routing system. An ASN rule can match addresses outside the Nigerian IP ranges listed here when the client associates those destination addresses with that ASN.

## Published datasets

### Registry allocations: `data/`

The root dataset selects active `NG` records from AFRINIC, APNIC, ARIN, and LACNIC extended delegated statistics. The country code is the source's code recorded for an allocation or assignment; it does not report where every address is used or which prefixes are currently announced in BGP. Coverage includes four of the five RIR feeds; RIPE NCC is excluded under its applicable service terms, so this is not a complete all-RIR list.

- `ASN.Nigeria.list` and `asns.txt` contain AFRINIC/APNIC/ARIN/LACNIC NG-coded ASN allocations and assignments.
- `IPv4.Nigeria.list` contains exact CIDR blocks converted from IPv4 start/count records.
- `IPv6.Nigeria.list` contains validated, aligned IPv6 allocation prefixes.
- `IP.Nigeria.list` combines those allocation IPv4 and IPv6 blocks.
- `networks.json` and `resources.json` retain the registry claims. Where DB-IP ASN Lite supplies an organization label for an ASN, `networks.json` includes the exact label, DB-IP release, all observed candidate labels and counts, and the deterministic choice (most frequent, then lexical). Missing labels stay `null`. These labels are DB-IP organization names, not registry names, and do not establish Nigerian registration.
- `metadata.json` records each registry's source serial, total source row count, selected NG row count, terms notice, attribution, fetch time, and output counts. A valid registry feed with no active NG-coded rows is retained as a zero-row source contribution.

### DB-IP country-geolocation classification: `data/country-ip/`

These files select ranges that DB-IP IP to Country Lite labels `NG`. DB-IP describes Lite as a reduced-coverage and reduced-accuracy subset. The lists therefore cover the records in that source, not every address, and represent a provider's country classification rather than registry allocation or guaranteed physical location.

- `ASN.Nigeria.list` and `asns.txt` contain an ASN when DB-IP IP to ASN Lite maps at least one address overlapping a DB-IP NG country range to that ASN. This is an address-to-ASN association, not an RIR country assignment.
- `IPv4.Nigeria.list`, `IPv6.Nigeria.list`, and `IP.Nigeria.list` contain exact address ranges converted to minimal CIDR blocks without widening the source coverage.
- `resources.json` stores source range endpoints, their exact CIDR conversion, and associated ASNs.
- `metadata.json` records both DB-IP sources, monthly release, published checksums and record totals, attribution, terms, collection time, and ASNs also present in the registry ASN list. Matching ASN numbers are reported as overlap; neither source replaces the other.

Both datasets include separate client formats. The `surge/` paths use Surge `IP-CIDR`, `IP-CIDR6`, and `IP-ASN` syntax. The `quantumult-x/` paths use Quantumult X's `ip-cidr`, `ip6-cidr`, and `ip-asn` syntax with `direct` as the policy. Change `direct` to a policy defined in your profile if needed. Generated rule files start with source comments supported by both formats. See [Surge's IP rule documentation](https://manual.nssurge.com/rules/ip.html) and [rule-set documentation](https://manual.nssurge.com/rules/ruleset.html), plus the [Quantumult X sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf).

### Copy-ready subscriptions

Choose a dataset and rule type. These examples send matching traffic direct; replace the policy with one already defined in your profile if needed. Put Surge lines in `[Rule]` and Quantumult X lines in `[filter_remote]`.

```ini
# Surge: AFRINIC/APNIC/ARIN/LACNIC registry allocation ASN rules
RULE-SET,https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/surge/ASN.Nigeria.list,DIRECT

# Quantumult X: AFRINIC/APNIC/ARIN/LACNIC registry allocation ASN rules
https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/quantumult-x/ASN.Nigeria.list, tag=NigeriaRegistryASN, force-policy=direct, update-interval=86400, enabled=true

# Surge: DB-IP Nigeria country-classified IP ranges
RULE-SET,https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/country-ip/surge/IP.Nigeria.list,DIRECT

# Quantumult X: DB-IP Nigeria country-classified IP ranges
https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/country-ip/quantumult-x/IP.Nigeria.list, tag=NigeriaCountryIP, force-policy=direct, update-interval=86400, enabled=true
```

ASN alternatives are `data/surge/ASN.Nigeria.list`, `data/quantumult-x/ASN.Nigeria.list`, `data/country-ip/surge/ASN.Nigeria.list`, and `data/country-ip/quantumult-x/ASN.Nigeria.list`. Country-IP IPv4-only and IPv6-only files are also available beside `IP.Nigeria.list`.

An ASN rule matches traffic to any destination address the app associates with that ASN. A network may use addresses outside Nigerian ranges, so ASN rules can match traffic outside the country-IP subscriptions. Use an IP CIDR list when you want matches limited to the published ranges.

The apps are not available in this environment, so device behavior has not been verified. To check each app, make a duplicate test profile and add one registry subscription and one country-IP subscription at a time. In Surge, put each `RULE-SET,<URL>,DIRECT` line in `[Rule]` before the final rule; in Quantumult X, put its URL line under `[filter_remote]` with a unique `tag` and `force-policy=direct`. Refresh the remote set and confirm the app reports a successful download and nonzero rule count. Use the app's rule test or connection log with a known listed IP literal and an unrelated control IP; record the matched rule, selected policy, outcome, app version, refresh time, and screenshots of the remote-set status and test results. Do not replace or activate your everyday profile for this check. If live routing requires enabling or changing a device VPN or system proxy setting, stop and ask before changing it.

## Collection and updates

The collector fetches the latest AFRINIC, APNIC, ARIN, and LACNIC delegated statistics plus the current monthly DB-IP Lite release pages and CSV archives. It checks HTTP status and content type, uses bounded timeouts and response sizes, verifies DB-IP's published expanded-CSV SHA-1 and row count, parses every record, validates ranges, rejects conflicting records within one registry, records cross-registry duplicates and field conflicts, and checks that country and ASN feeds refer to the same monthly release. A valid zero-NG contribution is allowed. It generates output only after every source has passed validation. A failed fetch or validation leaves the complete previous dataset in place; file replacement is staged with rollback on a replacement error.

The GitHub Actions workflow runs tests, typecheck, build, and collection on pushes to `main`, daily, and manual dispatch. DB-IP publishes Lite releases monthly; the daily run reads its official release pages and uses the latest release they report. These are daily checks, not real-time updates. GitHub Actions commits generated files only if data records change; metadata-only changes do not create commits. A failed fetch or validation leaves the previous files intact. A successful scheduled workflow run must be verified on GitHub; a local or push-triggered run does not establish it.

### Run in Windows PowerShell

From the repository folder, with Node.js 20 or newer and npm installed:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` needs IPv4 HTTPS access to `ftp.afrinic.net`, `ftp.apnic.net`, `ftp.arin.net`, `ftp.lacnic.net`, `db-ip.com`, and `download.db-ip.com`. It uses Node's native HTTPS client with normal TLS certificate verification; TLS checks are not disabled. The DB-IP CSV archives are downloaded to memory, bounded to 16 MiB compressed and 64 MiB expanded, and are not saved into the repository.

## Sources, attribution, and licensing

### DB-IP Lite

The official [IP to Country Lite page](https://db-ip.com/db/download/ip-to-country-lite) documents the range and country fields, release metadata, and monthly updates. The [IP to ASN Lite page](https://db-ip.com/db/download/ip-to-asn-lite) documents address ranges, ASN numbers, organizations, and monthly updates. The [IP to Country Lite CSV specification](https://db-ip.com/db/format/ip-to-country-lite/csv.html) defines `ip_start,ip_end,country`. For ASN Lite, the collector checks each downloaded row against the four-field shape observed in the official CSV and verifies the full file against the release page's published checksum and record count.

Both free Lite download pages explicitly license the data under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) and require attribution to DB-IP.com. DB-IP's [terms](https://db-ip.com/tos.php) state that their paid-database redistribution restriction does not apply to free downloads licensed under CC BY 4.0. The project attributes DB-IP in each country-IP metadata file and this documentation, and identifies the filtering, CIDR conversion, and formatting changes. These conditions support the transformed public outputs; this is not a legal opinion.

### AFRINIC and other RIRs

The [AFRINIC extended-statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) says its files are "freely available for download and use" subject to a no-liability condition. It does not expressly discuss transformed public lists or automated publication. AFRINIC-derived data is published with attribution and its disclaimer, following the project's interpretation rather than official confirmation. APNIC's [extended-statistics README](https://ftp.apnic.net/stats/apnic/README-EXTENDED.TXT) likewise permits free download and use subject to a no-liability condition. AFRINIC lists `techops@afrinic.net` for statistics questions; no message is being sent as part of this collection.

ARIN's [extended-statistics page](https://www.arin.net/reference/research/statistics/nro_stats/) says its daily extended files are available for use via HTTPS. Its linked [RIR statistics README](https://ftp.arin.net/pub/stats/arin/README) defines the report format but has no separate redistribution license. ARIN's Whois terms expressly govern use of the Whois Service and Whois data; they are not treated as governing this separate delegated-statistics feed. The project publishes ARIN records with source attribution and relies on the official availability-for-use statement without claiming a broader license.

LACNIC's [report README](https://ftp.lacnic.net/pub/stats/lacnic/README) describes the daily allocation and assignment summaries. Its [source disclaimer](https://ftp.lacnic.net/pub/stats/lacnic/disclaimer.txt) says the files are freely available for download and use, provided LACNIC is not held responsible for loss or damage arising from report use. LACNIC records are published with that attribution and condition.

RIPE NCC's [current Terms of Service](https://www.ripe.net/about-us/legal/terms-of-service/) define publicly available RIPE NCC services to include services made available via the website, API, or other protocols. The delegated statistics are directly downloadable from RIPE's public FTP statistics service, while the [statistics README](https://ftp.ripe.net/pub/stats/ripencc/RIR-Statistics-Exchange-Format.txt) defines only the format and offers no separate redistribution permission. On that specific wording and source path, the general terms appear applicable to republishing the FTP data; the project therefore excludes RIPE records. DB-IP country-geolocation associations remain separate and do not fill in or stand in for registry assignments. Four registries are covered; global registry completeness is not claimed.

### Project code and data rights

The [MIT License](LICENSE) applies to the original code in this repository. It does not grant rights to upstream data. DB-IP-derived outputs carry CC BY 4.0 attribution and change notices. AFRINIC and APNIC outputs carry their source attribution and disclaimers; ARIN outputs carry attribution based on its availability-for-use statement; LACNIC outputs carry attribution and its use disclaimer. No upstream author's identity or code was copied from the inspiration project.

## Comparison with ASN-China

This comparison is based on the current [ASN-China README](https://github.com/missuo/ASN-China), [`ASN_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/ASN_CN.py), [`IP_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/IP_CN.py), and [daily workflow](https://github.com/missuo/ASN-China/blob/main/.github/workflows/ci.yml), checked on 2026-10-19. ASN-China's ASN script scrapes the `#asns` table on `bgp.he.net`; it does not collect BGP route snapshots. Its IP script copies country, IPv4, and IPv6 files from `cbuijs/ipasn` without transformation. That repository describes itself as an IP-to-ASN list, but its reviewed documentation does not establish how its country files are classified or grant redistribution terms.

| Capability | ASN-China | ASN Nigeria | Status |
| --- | --- | --- | --- |
| ASN list | HE country-page ASN table with names | Four RIR NG allocations plus separate DB-IP address-to-ASN associations | Both are published; semantics differ and DB-IP labels are separately attributed. |
| IPv4, IPv6, combined lists | Copies country-specific lists from `cbuijs/ipasn` | Publishes AFRINIC allocation lists and separate DB-IP country-geolocation lists | Outputs exist with disclosed sources and classifications. |
| Proxy formats | Surge and Quantumult X rule subscriptions | Separate Surge and Quantumult X files for both datasets | Present. |
| Daily/manual update | Daily cron and manual workflow | Daily cron, manual dispatch, and push trigger; validation before collection | Present; DB-IP source releases are monthly. |
| Geographic meaning | The `ipasn` docs do not explain the country-file method | One registry-holder country classification and one reduced-coverage DB-IP geolocation classification | Explicitly distinguished. |
| Full NG-coded RIR allocations | Not the same source model | AFRINIC, APNIC, ARIN, and LACNIC; RIPE NCC excluded under its service terms | Four of five feeds; no all-RIR completeness claim. |
| Network names | Scraped from the HE table | DB-IP organization labels attached with release and candidate provenance | Labels are not registry assertions. |

No BGP route snapshot is an ASN-China parity requirement based on its inspected scripts. Remaining limitations are incomplete all-RIR coverage, exclusion of RIPE data under its reuse terms, reduced DB-IP Lite coverage and accuracy, possible classification errors, and that organization labels come from DB-IP rather than the registry. Device import and routing require a manual check in each app.
