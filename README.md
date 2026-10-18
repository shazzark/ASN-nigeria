# ASN Nigeria

ASN Nigeria collects Nigerian-coded Internet number allocations and assignments from AFRINIC's daily extended delegated statistics file. The source reports Autonomous System Numbers (ASNs), IPv4 ranges, and IPv6 prefixes. An ASN identifies an autonomous routing system. The source does not include network names, so `networks.json` uses `name: null` and preserves the source's opaque holder ID instead of guessing a name.

## What the records mean

These are AFRINIC registry records for resource holders whose registered country code is `NG`. They describe where a resource holder is legally based according to the registry, not where an IP address is currently used. Allocations and assignments are not observed BGP announcements and are not a physical geolocation database. This source covers AFRINIC's registry records; it may not include every Nigerian organization with resources registered at another RIR.

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

`npm run update` fetches the AFRINIC extended delegated file with a 30 second timeout and checks HTTP status, record format, source-declared record count, country code, resource type, and status. It converts and validates all records before staging output files. Fetch or validation errors exit nonzero without replacing the existing dataset. Identical generated records do not rewrite files or the metadata timestamp.

The GitHub Actions workflow retains daily and manual triggers but runs tests, typecheck, and build only. It does not fetch, upload, commit, or publish generated data. The collector remains available for local use. No scheduled GitHub run has been observed as part of this work.

## Sources, terms, and licensing

The primary source is the [AFRINIC extended statistics README](https://ftp.afrinic.net/stats/afrinic/README-EXTENDED.txt) and its [RIR statistics exchange format](https://ftp.afrinic.net/stats/afrinic/RIR-Statistics-Exchange-Format.txt). AFRINIC says its reports cover ASN, IPv4, and IPv6 dispositions, are daily, and are freely available for download and use subject to a no-liability condition. The standard specifies a persistent `delegated-afrinic-extended-latest` filename for automated fetching. It documents pipe-separated records with country, type, start, value, date, status, and an opaque holder ID. The IPv4 `value` is an address count and may not be a CIDR-sized range; the IPv6 value is a prefix length.

The documentation authorizes download and use but does not expressly describe redistribution of derived rule lists. Therefore, the project keeps generated records out of Git and disables automated data publication until that specific use is confirmed. AFRINIC WHOIS terms are separate and restrictive; this collector does not query WHOIS or use it to add names. AFRINIC's statistics disclaimer also says that records are not an authoritative statement of where a resource is currently used.

For BGP announcements, [RIPE RIS](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/) provides observed routing data. RIPE's [copyright statement](https://www.ripe.net/about-us/legal/copyright-statement/) restricts reuse of RIPE materials, while its [commercial-use terms](https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris/commercial-use/) describe conditional, revocable permission with attribution requirements. That does not establish permission for this project's intended redistribution. [RouteViews API documentation](https://api.routeviews.org/docs/) describes route-query access, but applicable reuse and redistribution terms for derived public lists have not been established. Neither source is used by the current collector; route lists remain out of scope until their specific terms are resolved.

The [MIT license](LICENSE) applies only to original code in this repository. It does not license AFRINIC data, BGP data, or generated files derived from them. Source attribution is provided here and in generated metadata.

Proxy rule syntax follows the [Surge IP rule documentation](https://manual.nssurge.com/rules/ip.html) and the [official Quantumult X sample configuration](https://github.com/crossutility/Quantumult-X/blob/master/sample.conf). Surge external rule sets omit the policy field; Quantumult X filter rules include a policy field, set to `direct` in generated files.

The [ASN-China](https://github.com/missuo/ASN-China) project combines ASN data and a separate IP source for China and advertises daily updates. ASN Nigeria is an original TypeScript collector with an AFRINIC allocation/assignment meaning, exact IPv4 range conversion, IPv6 validation, structured provenance, and separate Surge and Quantumult X output. It does not currently provide BGP-announced prefixes or network names.
