import { collectDelegatedData } from "./collect";

collectDelegatedData().then((count) => {
  console.log(`Validated and generated allocation data for ${count} Nigerian ASNs from AFRINIC.`);
}).catch((error: unknown) => {
  console.error(`ASN collection failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
