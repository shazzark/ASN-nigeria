import { fetchCountryPage, SOURCE_URL } from "./sources/he";
import { collectFromHtml } from "./collect";

async function main(): Promise<void> {
  const html = await fetchCountryPage();
  const count = await collectFromHtml(html);
  console.log(`Validated and published ${count} Nigerian ASNs from ${SOURCE_URL}.`);
}

main().catch((error: unknown) => {
  console.error(`ASN collection failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
