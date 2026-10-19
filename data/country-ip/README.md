# DB-IP country-classification outputs

These generated lists are derived from DB-IP's monthly IP to Country Lite and IP to ASN Lite downloads. DB-IP classifies the listed IP ranges as Nigeria (`NG`). Lite is a reduced-coverage and reduced-accuracy subset. The classification is not an RIR resource-holder country assignment, a BGP route snapshot, or a guarantee of physical location.

An ASN appears when DB-IP IP to ASN Lite maps at least one address overlapping an NG country range to that number. It is therefore an address-to-ASN association. The separate AFRINIC/APNIC registry-allocation output remains in the parent `data/` directory.

**Attribution:** IP address country classification and ASN association data by [DB-IP.com](https://db-ip.com/), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This project filters the data to NG, converts inclusive IP ranges to exact minimal CIDR blocks, and formats client rule files.

`resources.json` also preserves the source organization labels for associated ASNs. See `metadata.json` for source release dates, official release-page links, checksums, record totals, source terms, counts, attribution, and collection time. See the [DB-IP Lite terms](https://db-ip.com/tos.php), which state that the terms for paid databases do not apply to free CC BY 4.0 downloads.
