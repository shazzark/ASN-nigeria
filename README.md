# ASN Nigeria

ASN Nigeria collects Autonomous System Numbers (ASNs) and network names shown on the [Hurricane Electric BGP Toolkit Nigeria page](https://bgp.he.net/country/NG). An ASN identifies an autonomous routing network on the Internet. This project publishes ASN rules and the source names only; it does not provide IPv4 or IPv6 address ranges.

## Files

- `data/ASN.Nigeria.list` contains proxy rules in `IP-ASN,<number>` format.
- `data/asns.txt` contains one plain ASN number per line.
- `data/networks.json` contains sorted records with `asn` and normalized `name` fields.
- `data/metadata.json` records the source URL, country code (`NG`), record count, and UTC time of the successful fetch that produced the currently published records.

A Nigeria-associated ASN does not mean every address routed by that network is physically in Nigeria. The source describes network associations, not the physical location of each IP address.

## Collect data

Requirements: Node.js 20 or newer and npm.

In Windows PowerShell, from the project directory:

```powershell
npm ci
npm test
npm run typecheck
npm run build
npm run update
```

`npm run update` requests the source once, with a 15 second timeout, checks the HTTP response and table shape, validates and sorts the records, then stages all four files before replacing published output. Any fetch or validation error exits unsuccessfully without touching existing output. If the ASN records are unchanged, published files and their metadata stay unchanged.

The GitHub Actions workflow runs daily and also supports **Run workflow** through `workflow_dispatch`. While redistribution permission for the source data remains unresolved, this workflow runs tests, typecheck, and build only. It does not fetch or publish source-derived data and has read-only repository permissions. Local data collection remains available with `npm run update`. Updates, when performed locally, are daily at most, not real time. The workflow has not been observed running on GitHub as part of this implementation.

## Source, attribution, and licensing

The data source is the [Hurricane Electric BGP Toolkit](https://bgp.he.net/country/NG). The collector is original TypeScript code inspired by the organization of [ASN-China](https://github.com/missuo/ASN-China), which separately gathers ASN and IP data. This project is focused on Nigerian ASNs and does not copy its code or claim to supply IP ranges.

The original code in this repository is licensed under MIT; see [LICENSE](LICENSE). That license applies only to this project's original code, not to Hurricane Electric's source data or generated files derived from it. Hurricane Electric's [legal notices](https://www.he.net/about_legal.html) link to its [copyright notice](https://www.he.net/copyright.html), which says that website content may not be reproduced without prior consent and that use outside the site's intended purpose is prohibited. I found no permission granting redistribution of the country table. Public visibility does not itself grant that permission, so redistribution rights for the collected data remain unresolved. The generated `data/` directory is ignored by Git and must not be committed or published unless those rights are established. This project attributes the source and makes no claim that the source data is licensed for reuse. Obtain guidance or consent from Hurricane Electric before relying on redistribution.

## Difference from ASN-China

ASN-China covers China and publishes both ASN and IP datasets from separate sources. ASN Nigeria is a new, smaller TypeScript project for country code `NG`; it publishes only ASN numbers, network names, proxy ASN rules, and collection metadata.
