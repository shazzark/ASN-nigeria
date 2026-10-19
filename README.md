# ASN Nigeria

ASN Nigeria collects two different kinds of Nigeria-related Internet data: AFRINIC registry allocations and assignments, plus DB-IP Lite country-geolocation classifications. They are published in separate directories because their country labels mean different things.

An Autonomous System Number (ASN) identifies an autonomous routing system. An ASN associated with a Nigeria-classified IP range does not mean that every address used by that network is physically in Nigeria.

## Published datasets

### AFRINIC allocations: `data/`

The root dataset selects active `NG` records from AFRINIC's extended delegated statistics. Its country code identifies the resource holder's registered country. It is registry-allocation coverage; it does not report where every address is used or which prefixes are currently announced in BGP.

- `ASN.Nigeria.list` and `asns.txt` contain AFRINIC NG-coded ASN allocations and assignments.
- `IPv4.Nigeria.list` contains exact CIDR blocks converted from IPv4 start/count records.
- `IPv6.Nigeria.list` contains validated, aligned IPv6 allocation prefixes.
- `IP.Nigeria.list` combines those allocation IPv4 and IPv6 blocks.
- `networks.json` and `resources.json` retain the source claims. Network names are unavailable in this source and remain `null`.
- `metadata.json` records AFRINIC provenance, source serial, terms notice, attribution, fetch time, and counts.

### DB-IP country-geolocation classification: `data/country-ip/`

These files select ranges that DB-IP IP to Country Lite labels `NG`. DB-IP describes Lite as a reduced-coverage and reduced-accuracy subset. The lists therefore cover the records in that source, not every address, and represent a provider's country classification rather than registry allocation or guaranteed physical location.

- `ASN.Nigeria.list` and `asns.txt` contain an ASN when DB-IP IP to ASN Lite maps at least one address overlapping a DB-IP NG country range to that ASN. This is an address-to-ASN association, not an RIR country assignment.
- `IPv4.Nigeria.list`, `IPv6.Nigeria.list`, and `IP.Nigeria.list` contain exact address ranges converted to minimal CIDR blocks without widening the source coverage.
- `resources.json` stores source range endpoints, their exact CIDR conversion, and associated ASNs.
- `metadata.json` records both DB-IP sources, monthly release, published checksums and record totals, attribution, terms, collection time, and ASNs also present in the AFRINIC ASN list. Matching ASN numbers are reported as overlap; neither source replaces the other.

Both datasets include separate client formats. The `surge/` paths use Surge `IP-CIDR`, `IP-CIDR6`, and `IP-ASN` syntax. The `quantumult-x/` paths use Quantumult X's `ip-cidr`, `ip6-cidr`, and `ip-asn` syntax with `direct` as the policy. Change `direct` to a policy defined in your profile if needed. See [Surge's IP rule documentation](https://manual.nssurge.com/rules/ip.html) and the [Quantumult X sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf).

Use the allocation ASN rules with:

```ini
# Surge
RULE-SET, https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/surge/ASN.Nigeria.list, DIRECT

# Quantumult X [filter_remote]
https://raw.githubusercontent.com/shazzark/ASN-nigeria/main/data/quantumult-x/ASN.Nigeria.list, tag=NigeriaASN, force-policy=direct, update-interval=86400, opt-parser=true, enabled=true
```

For DB-IP country-classified rules, use the same relative paths under `data/country-ip/` (for example `data/country-ip/surge/IPv4.Nigeria.list`).

## Collection and updates

The collector fetches AFRINIC's latest delegated statistics and the current monthly DB-IP Lite release pages and CSV archives. It checks HTTP status and content type, uses bounded timeouts and response sizes, verifies DB-IP's published expanded-CSV SHA-1 and row count, parses every record, validates ranges, rejects conflicting overlaps, and checks that country and ASN feeds refer to the same monthly release. It generates output only after every source has passed validation. A failed fetch or validation leaves the complete previous dataset in place; file replacement is staged with rollback on a replacement error.

The GitHub Actions workflow runs tests, typecheck, build, and collection on pushes to `main`, daily, and manual dispatch. DB-IP publishes Lite releases monthly; the daily run reads its official release pages and uses the latest release they report. Updates are daily snapshots, not real time. GitHub Actions commits generated files only if published records change; metadata-only changes do not create commits. A successful workflow run has not been claimed unless observed in GitHub.

### Run in Windows PowerShell

From the repository folder, with Node.js 20 or newer and npm installed:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` needs IPv4 HTTPS access to `ftp.afrinic.net`, `db-ip.com`, and `download.db-ip.com`. It uses Node's native HTTPS client with normal TLS certificate verification; TLS checks are not disabled. The DB-IP CSV archives are downloaded to memory, bounded to 16 MiB compressed and 64 MiB expanded, and are not saved into the repository.

## Sources, attribution, and licensing

### DB-IP Lite

The official [IP to Country Lite page](https://db-ip.com/db/download/ip-to-country-lite) documents the range and country fields, release metadata, and monthly updates. The [IP to ASN Lite page](https://db-ip.com/db/download/ip-to-asn-lite) documents address ranges, ASN numbers, organizations, and monthly updates. The [IP to Country Lite CSV specification](https://db-ip.com/db/format/ip-to-country-lite/csv.html) defines `ip_start,ip_end,country`. For ASN Lite, the collector checks each downloaded row against the four-field shape observed in the official CSV and verifies the full file against the release page's published checksum and record count.

Both free Lite download pages explicitly license the data under [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/) and require attribution to DB-IP.com. DB-IP's [terms](https://db-ip.com/tos.php) state that their paid-database redistribution restriction does not apply to free downloads licensed under CC BY 4.0. The project attributes DB-IP in each country-IP metadata file and this documentation, and identifies the filtering, CIDR conversion, and formatting changes. These conditions support the transformed public outputs; this is not a legal opinion.

### AFRINIC and other RIRs

The [AFRINIC extended-statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) says its files are "freely available for download and use" subject to a no-liability condition. It does not expressly discuss transformed public lists or automated publication. At the project's direction, AFRINIC-derived data continues to be published with attribution and its disclaimer; this follows the project's interpretation of that broad wording, not official confirmation or a claim of legal certainty. AFRINIC lists `techops@afrinic.net` for statistics questions; no message is being sent as part of this collection.

The registry allocation output remains AFRINIC-only. The [Telecom SudParis RIR delegation index](https://www-public.telecom-sudparis.eu/~maigron/rir-stats/rir-delegations/delegations/asn/ng-asn-delegations.html) identifies six active NG-coded RIPE NCC ASNs: `29465`, `35074`, `197752`, `214354`, `215340`, and `218942`. The index is a secondary compilation of the RIR statistics files; it does not clear use of the underlying RIPE data. RIPE NCC's public-services terms contain an explicit restriction on reusing data from covered services, while the statistics README does not say whether that restriction covers its FTP statistics. The applicability to that specific file remains uncertain, so those records are not collected or included in the allocation dataset. APNIC, ARIN, and LACNIC statistics did not supply NG ASN records in that cross-RIR check. DB-IP country-geolocation associations provide additional ASN coverage with different semantics; they do not fill in or stand in for those registry assignments.

### Project code and data rights

The [MIT License](LICENSE) applies to the original code in this repository. It does not grant rights to upstream data. DB-IP-derived outputs carry CC BY 4.0 attribution and change notices. AFRINIC output retains its source attribution and disclaimer, with the unresolved point described above. No upstream author's identity or code was copied from the inspiration project.

## Comparison with ASN-China

This comparison is based on the current [ASN-China README](https://github.com/missuo/ASN-China), [`ASN_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/ASN_CN.py), [`IP_CN.py`](https://github.com/missuo/ASN-China/blob/main/scripts/IP_CN.py), and [daily workflow](https://github.com/missuo/ASN-China/blob/main/.github/workflows/ci.yml), checked on 2026-10-19. ASN-China's ASN script scrapes the `#asns` table on `bgp.he.net`; it does not collect BGP route snapshots. Its IP script copies country, IPv4, and IPv6 files from `cbuijs/ipasn` without transformation. That repository describes itself as an IP-to-ASN list, but its reviewed documentation does not establish how its country files are classified or grant redistribution terms.

| Capability | ASN-China | ASN Nigeria | Status |
| --- | --- | --- | --- |
| ASN list | HE country-page ASN table with names | AFRINIC NG allocations plus separate DB-IP address-to-ASN associations | Both are published; semantics differ and names remain optional/unavailable. |
| IPv4, IPv6, combined lists | Copies country-specific lists from `cbuijs/ipasn` | Publishes AFRINIC allocation lists and separate DB-IP country-geolocation lists | Outputs exist with disclosed sources and classifications. |
| Proxy formats | Surge and Quantumult X rule subscriptions | Separate Surge and Quantumult X files for both datasets | Present. |
| Daily/manual update | Daily cron and manual workflow | Daily cron, manual dispatch, and push trigger; validation before collection | Present; DB-IP source releases are monthly. |
| Geographic meaning | The `ipasn` docs do not explain the country-file method | One registry-holder country classification and one reduced-coverage DB-IP geolocation classification | Explicitly distinguished. |
| Full NG-coded RIR allocations | Not the same source model | AFRINIC only; six identified RIPE records remain excluded pending clarification of terms applicability | Remaining essential registry-coverage gap. |
| Network names | Scraped from the HE table | Not supplied by AFRINIC statistics; DB-IP organization fields are not used as network-name enrichment | Optional enhancement. |

No BGP route snapshot is an ASN-China parity requirement based on its inspected scripts. Remaining limitations are the unresolved applicability of RIPE NCC's restriction to its statistics file, reduced DB-IP Lite coverage and accuracy, possible classification errors, and the lack of AFRINIC network names. The daily workflow and release formats are implemented locally; whether a particular GitHub Actions run succeeds must be checked on GitHub.
