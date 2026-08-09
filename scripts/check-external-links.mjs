import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const INPUT = path.resolve('scripts/medium-import-report.json');
const OUTPUT = path.resolve('scripts/external-link-report.json');
const MAX_REDIRECTS = 6;

async function inspectLink(url) {
  const redirects = [];
  let currentUrl = url;

  try {
    for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
      const response = await fetch(currentUrl, {
        headers: {
          Range: 'bytes=0-0',
          'User-Agent': 'NirmalsNotesLinkChecker/1.0',
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
      });

      if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
        const nextUrl = new URL(response.headers.get('location'), currentUrl).toString();
        redirects.push({ status: response.status, from: currentUrl, to: nextUrl });
        currentUrl = nextUrl;
        continue;
      }

      const classification = response.ok
        ? 'ok'
        : [401, 403, 429].includes(response.status)
          ? 'restricted'
          : 'dead';
      return { url, finalUrl: currentUrl, status: response.status, classification, redirects };
    }
    return { url, finalUrl: currentUrl, classification: 'error', redirects, error: 'Too many redirects' };
  } catch (error) {
    return { url, finalUrl: currentUrl, classification: 'error', redirects, error: error.message };
  }
}

async function main() {
  const migration = JSON.parse(await readFile(INPUT, 'utf8'));
  const posts = [...migration.imported, ...migration.skipped];
  const links = [...new Set(posts.flatMap((post) => post.externalLinks ?? []))].sort();
  const results = [];

  for (let index = 0; index < links.length; index += 5) {
    results.push(...await Promise.all(links.slice(index, index + 5).map(inspectLink)));
  }

  const counts = results.reduce((summary, result) => {
    summary[result.classification] = (summary[result.classification] ?? 0) + 1;
    return summary;
  }, {});
  const report = {
    generatedAt: new Date().toISOString(),
    source: path.relative(process.cwd(), INPUT),
    counts,
    results,
  };
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Checked ${links.length} external links: ${JSON.stringify(counts)}`);
  console.log(`Report: ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
