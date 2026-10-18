# ASN Nigeria

ASN Nigeria collects Nigerian-coded Internet number allocations and assignments from AFRINIC's daily extended delegated statistics file. The source reports Autonomous System Numbers (ASNs), IPv4 ranges, and IPv6 prefixes. An ASN identifies an autonomous routing system. The source does not include network names, so `networks.json` uses `name: null` and preserves the source's opaque holder ID instead of guessing a name.

## What the records mean

These are AFRINIC registry records for resource holders whose registered country code is `NG`. They describe where a resource holder is legally based according to the registry, not where an IP address is currently used. Allocations and assignments are not observed BGP announcements and are not a physical geolocation database. This source covers AFRINIC's registry records; it does not cover every Nigerian organization with resources registered at another RIR. In a live check on 2026-10-18 of the other official extended delegated-statistics files, RIPE NCC contained 6 active NG ASN records, 4 IPv4 records, and 1 IPv6 record; APNIC, ARIN, and LACNIC each had zero active NG records. These are source-record counts observed on that date, not counts of individual addresses or a promise that future files will have the same counts. Those records are not added to this collector.

The output files under `data/` are generated locally and ignored by Git while redistribution rights are being confirmed:

- `ASN.Nigeria.list` and `asns.txt` contain allocated or assigned ASN identifiers.
- `IPv4.Nigeria.list` contains exact CIDR blocks converted from IPv4 start/count ranges.
- `IPv6.Nigeria.list` contains validated, aligned IPv6 prefixes.
- `IP.Nigeria.list` combines the IPv4 and IPv6 CIDR lists without merging adjacent or overlapping ranges.
- `networks.json` contains ASN records. The source has no network-name field, so names are null.
- `resources.json` contains structured IPv4 and IPv6 records with source holder ID, date, and status.
- `surge/` contains Surge rules: `IP-CIDR`, `IP-CIDR6`, and `IP-ASN` entries without a policy, as required for external rule sets.
- `quantumult-x/` contains Quantumult X `ip-cidr`, `ip6-cidr`, and `ip-asn` rules, using `direct` as the policy. Change that policy to one configured in your Quantumult X profile if needed.
- `metadata.json` records source URL and serial, country code, collection time, counts, and the meaning of these records.

These allocation lists do not include announced routes. A future BGP-derived dataset must be published separately and labelled as observed routing data; reuse terms for BGP sources have not been established for this project.

## Collect data locally

Requirements: Node.js 20 or newer and npm. In Windows PowerShell, from the project directory:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` fetches the AFRINIC extended delegated file with a 30 second timeout and checks HTTP status, record format, source-declared record count, country code, resource type, and status. It converts and validates all records before staging output files. Unknown record extension fields are currently rejected until their meaning is reviewed. Fetch or validation errors exit nonzero without replacing the existing dataset. Identical generated records do not rewrite files or the metadata timestamp. If a file replacement fails after earlier replacements succeeded, the collector tries to restore all earlier files and reports an `AggregateError` if restoration itself fails. This rollback handles ordinary caught errors; it is not crash-atomic if the process or machine stops mid-replacement.

The GitHub Actions workflow retains daily and manual triggers but runs tests, typecheck, and build only. It does not fetch, upload, commit, or publish generated data. The collector remains available for local use. No scheduled GitHub run has been observed as part of this work.

## Sources, terms, and licensing

The primary source is the [AFRINIC extended statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) and its [RIR statistics exchange format](https://ftp.afrinic.net/stats/afrinic/RIR-Statistics-Exchange-Format.txt). AFRINIC says its reports cover ASN, IPv4, and IPv6 dispositions, are daily, and are freely available for download and use subject to a no-liability condition. The standard specifies a persistent `delegated-afrinic-extended-latest` filename for automated fetching. It documents pipe-separated records with country, type, start, value, date, status, and an opaque holder ID. The IPv4 `value` is an address count and may not be a CIDR-sized range; the IPv6 value is a prefix length.

The README's entire **Conditions of Use** section says the statistics files are `freely available for download and use` subject to AFRINIC not being held responsible for loss or damage. That is affirmative access/use wording, not an explicit prohibition. However, neither that section nor the linked format specification expressly answers whether republishing derived public proxy lists is included in `use`; the format's public-visibility and automatic-fetch instructions are operational, not an explicit data redistribution license. We therefore treat permission for this project's public release as unresolved, not denied. Generated records stay out of Git and automated data publication remains disabled until AFRINIC clarifies that intended reuse.

The separate [AFRINIC WHOIS Terms of Use](https://web10.mba.afrinic.net/terms-2) explicitly govern the WHOIS database and say its data may not be reproduced or made available to third parties without prior written authorization. This collector downloads the delegated statistics file, not the WHOIS database. We do not treat that WHOIS restriction as automatically applying to delegated statistics, and we do not use WHOIS to add network names. The statistics README separately disclaims accuracy and says these records do not authoritatively locate where a resource is currently used.

The statistics README directs questions or comments to `techops@afrinic.net`. The precise unanswered question is whether AFRINIC permits public redistribution of transformed ASN/CIDR rule lists generated from the extended delegated statistics, including attribution and any required conditions. No message has been sent. The separate MIT code license does not resolve this data-use question.

For BGP announcements, [RIPE RIS](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/) provides observed routing data. RIPE's [copyright statement](https://www.ripe.net/about-us/legal/copyright-statement/) restricts reuse of RIPE materials, while its [commercial-use terms](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/commercial-use/) describe conditional, revocable permission with attribution requirements. That does not establish permission for this project's intended redistribution. [RouteViews API documentation](https://api.routeviews.org/docs/) describes route-query access, but applicable reuse and redistribution terms for derived public lists have not been established. Neither source is used by the current collector; route lists remain out of scope until their specific terms are resolved.

The [APNIC](https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest), [ARIN](https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest), [LACNIC](https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest), and [RIPE NCC](https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest) statistics files use the shared RIR exchange format. The 2026-10-18 cross-RIR check found NG-coded records outside AFRINIC only in RIPE NCC's file. This confirms that AFRINIC-only output is incomplete as an all-RIR registry inventory. These other sources have not been added, and their applicable terms for derived public output need separate review.

The [MIT license](LICENSE) applies only to original code in this repository. It does not license AFRINIC data, BGP data, or generated files derived from them. Source attribution is provided here and in generated metadata.

Proxy rule syntax follows the [Surge IP rule documentation](https://manual.nssurge.com/rules/ip.html) and the [official Quantumult X sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf). Surge external rule sets omit the policy field; Quantumult X filter rules include a policy field, set to `direct` in generated files.

The [ASN-China](https://github.com/missuo/ASN-China) project combines ASN data and a separate IP source for China and advertises daily updates. ASN Nigeria is an original TypeScript collector with an AFRINIC allocation/assignment meaning, exact IPv4 range conversion, IPv6 validation, structured provenance, and separate Surge and Quantumult X output. It does not currently provide BGP-announced prefixes or network names.
