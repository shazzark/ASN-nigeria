import { collectCompleteData } from "./collect";

collectCompleteData().then(({ allocationAsns, countryAsns }) => {
  console.log(`Validated ${allocationAsns} registry allocation ASNs and ${countryAsns} DB-IP geolocation-associated ASNs.`);
}).catch((error: unknown) => {
  console.error(`ASN collection failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
