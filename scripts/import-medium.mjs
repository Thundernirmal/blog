import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const FEED_URL = 'https://medium.com/feed/@katariya_nirmal';
const CONTENT_ROOT = path.resolve('src/content/blog');
const REPORT_PATH = path.resolve('scripts/medium-import-report.json');
const force = process.argv.includes('--force');

const parser = new XMLParser({
  ignoreAttributes: false,
  cdataPropName: '__cdata',
  processEntities: true,
  trimValues: false,
});

const turndown = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  headingStyle: 'atx',
  strongDelimiter: '**',
});
turndown.use(gfm);
turndown.addRule('remove-empty-links', {
  filter: (node) => node.nodeName === 'A' && !node.textContent?.trim(),
  replacement: () => '',
});

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && '__cdata' in value) return value.__cdata;
  if (value && typeof value === 'object' && '#text' in value) return value['#text'];
  return String(value ?? '');
}

function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function cleanUrl(url) {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()]) {
    if (key === 'source' || key.startsWith('utm_')) parsed.searchParams.delete(key);
  }
  return parsed.toString();
}

function extensionFrom(response, sourceUrl) {
  const type = response.headers.get('content-type')?.split(';')[0].trim();
  const byType = {
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpeg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
  };
  if (type && byType[type]) return byType[type];
  const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
  return /^\.(avif|gif|jpe?g|png|svg|webp)$/.test(extension) ? extension : '.jpeg';
}

function yamlString(value) {
  return JSON.stringify(value);
}

function normalizeText(value) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function descriptionFrom($) {
  const opening = normalizeText($('p').first().text());
  if (opening.length <= 180) return opening;
  const clipped = opening.slice(0, 177).replace(/\s+\S*$/, '').trim();
  return `${clipped}…`;
}

function externalLinksFromMarkdown(markdown) {
  const links = [
    ...[...markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((match) => match[1]),
    ...[...markdown.matchAll(/href=["'](https?:\/\/[^"']+)["']/g)].map((match) => match[1]),
  ];
  return [...new Set(links)];
}

function normalizeHeadings($, title) {
  const firstHeading = $('h1, h2, h3, h4').first();
  if (firstHeading.length && normalizeText(firstHeading.text()).toLowerCase() === normalizeText(title).toLowerCase()) {
    firstHeading.remove();
  }
  $('h4').each((_, element) => {
    $(element).replaceWith(`<h3>${$(element).html() ?? ''}</h3>`);
  });
  $('h3').each((_, element) => {
    $(element).replaceWith(`<h2>${$(element).html() ?? ''}</h2>`);
  });
}

function combineAdjacentCodeBlocks($) {
  $('pre').each((_, element) => {
    if (!element.parent) return;
    const lines = [$(element).text()];
    let next = $(element).next();
    while (next.is('pre')) {
      lines.push(next.text());
      const removable = next;
      next = next.next();
      removable.remove();
    }
    $(element).empty().append($('<code></code>').text(lines.join('\n')));
  });
}

async function downloadFigure(sourceUrl, directory, index) {
  const response = await fetch(sourceUrl, {
    headers: { 'User-Agent': 'NirmalsNotesMediumImporter/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Image download failed (${response.status}): ${sourceUrl}`);
  const extension = extensionFrom(response, sourceUrl);
  const filename = `image-${String(index).padStart(2, '0')}${extension}`;
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(directory, filename), bytes);
  return { filename, bytes: bytes.length, sourceUrl, contentType: response.headers.get('content-type') };
}

async function findExistingMediumPosts() {
  const posts = new Map();
  for (const entry of await readdir(CONTENT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const output = path.join(CONTENT_ROOT, entry.name, 'index.md');
    if (!existsSync(output)) continue;
    const markdown = await readFile(output, 'utf8');
    const mediumId = markdown.match(/^mediumId:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
    if (mediumId) posts.set(mediumId, output);
  }
  return posts;
}

async function convertArticle(item, report, existingMediumPosts) {
  const title = normalizeText(getText(item.title));
  const mediumId = cleanUrl(getText(item.guid)).split('/').pop();
  const knownOutput = existingMediumPosts.get(mediumId);
  const slug = knownOutput ? path.basename(path.dirname(knownOutput)) : slugify(title);
  const originalUrl = cleanUrl(getText(item.link));
  const directory = path.join(CONTENT_ROOT, slug);
  const output = knownOutput ?? path.join(directory, 'index.md');

  if (existsSync(output) && !force) {
    const localImages = (await readdir(directory)).filter((filename) => /^image-\d+\.(avif|gif|jpe?g|png|svg|webp)$/i.test(filename));
    const localMarkdown = await readFile(output, 'utf8');
    report.skipped.push({
      slug,
      output: path.relative(process.cwd(), output),
      localImages: localImages.length,
      emptyAltText: [...localMarkdown.matchAll(/!\[\s*\]\(/g)].length,
      externalLinks: externalLinksFromMarkdown(localMarkdown),
      reason: 'index.md already exists; pass --force to replace it',
    });
    return;
  }

  await mkdir(directory, { recursive: true });
  const html = getText(item['content:encoded']);
  const $ = load(`<main>${html}</main>`, { decodeEntities: true });
  $('img[src*="medium.com/_/stat"]').remove();
  $('script, style, iframe').remove();
  normalizeHeadings($, title);
  combineAdjacentCodeBlocks($);
  const description = descriptionFrom($);

  $('a[href]').each((_, element) => {
    try {
      $(element).attr('href', cleanUrl($(element).attr('href')));
    } catch {
      report.warnings.push({ slug, warning: `Could not normalize link: ${$(element).attr('href')}` });
    }
  });
  const externalLinks = [...new Set(
    $('a[href]').toArray().map((element) => $(element).attr('href')).filter((href) => href?.startsWith('http')),
  )];

  const figures = [];
  let imageIndex = 0;
  for (const element of $('figure').toArray()) {
    const figure = $(element);
    const image = figure.find('img').first();
    if (!image.length || !image.attr('src')) {
      figure.remove();
      continue;
    }
    imageIndex += 1;
    let downloaded;
    try {
      downloaded = await downloadFigure(image.attr('src'), directory, imageIndex);
    } catch (error) {
      report.failedDownloads.push({ slug, sourceUrl: image.attr('src'), error: error.message });
      figure.remove();
      continue;
    }
    const captionElement = figure.find('figcaption');
    const captionHtml = captionElement.html() ?? '';
    const caption = normalizeText(turndown.turndown(captionHtml));
    const captionText = normalizeText(captionElement.text());
    const existingAlt = normalizeText(image.attr('alt') ?? '');
    const alt = existingAlt || captionText || `Image from “${title}”`;
    const token = `MEDIUMFIGURE${String(imageIndex).padStart(2, '0')}`;
    const markdown = `![${alt.replace(/\]/g, '\\]')}](./${downloaded.filename})${captionHtml ? `\n\n<span class="image-caption">${captionHtml}</span>` : ''}`;
    figures.push({ token, markdown, alt, caption, ...downloaded });
    figure.replaceWith(`<p>${token}</p>`);
  }

  for (const element of $('img').toArray()) {
    const image = $(element);
    if (!image.attr('src')) continue;
    imageIndex += 1;
    let downloaded;
    try {
      downloaded = await downloadFigure(image.attr('src'), directory, imageIndex);
    } catch (error) {
      report.failedDownloads.push({ slug, sourceUrl: image.attr('src'), error: error.message });
      image.remove();
      continue;
    }
    const alt = normalizeText(image.attr('alt') ?? '') || `Image from “${title}”`;
    const token = `MEDIUMFIGURE${String(imageIndex).padStart(2, '0')}`;
    figures.push({ token, markdown: `![${alt.replace(/\]/g, '\\]')}](./${downloaded.filename})`, alt, caption: '', ...downloaded });
    image.replaceWith(token);
  }

  let markdown = turndown.turndown($('main').html() ?? '').trim();
  for (const figure of figures) markdown = markdown.replace(figure.token, figure.markdown);
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u00a0/g, ' ')
    .trim();

  const tags = asArray(item.category).map((tag) => normalizeText(getText(tag))).filter(Boolean);
  const publishedAt = new Date(getText(item.pubDate));
  const updatedAt = item['atom:updated'] ? new Date(getText(item['atom:updated'])) : undefined;
  const frontmatter = [
    '---',
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    `slug: ${yamlString(slug)}`,
    `publishedAt: ${yamlString(publishedAt.toISOString())}`,
    ...(updatedAt ? [`updatedAt: ${yamlString(updatedAt.toISOString())}`] : []),
    'draft: false',
    `tags: ${JSON.stringify(tags)}`,
    `originalUrl: ${yamlString(originalUrl)}`,
    `mediumId: ${yamlString(mediumId)}`,
    'archived: true',
    '---',
    '',
  ].join('\n');

  await writeFile(output, `${frontmatter}${markdown}\n`);
  report.imported.push({
    slug,
    title,
    output: path.relative(process.cwd(), output),
    originalUrl,
    publishedAt: publishedAt.toISOString(),
    updatedAt: updatedAt?.toISOString(),
    tags,
    images: figures,
    emptyAltText: figures.filter((figure) => !figure.alt).length,
    externalLinks,
    description,
  });
}

async function main() {
  const response = await fetch(FEED_URL, {
    headers: { 'User-Agent': 'NirmalsNotesMediumImporter/1.0' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Medium feed request failed: ${response.status}`);

  const xml = await response.text();
  const document = parser.parse(xml);
  const items = asArray(document?.rss?.channel?.item);
  if (!items.length) throw new Error('Medium feed contained no stories.');

  const report = {
    generatedAt: new Date().toISOString(),
    source: FEED_URL,
    force,
    discovered: items.length,
    imported: [],
    skipped: [],
    failedDownloads: [],
    warnings: [],
  };

  await mkdir(CONTENT_ROOT, { recursive: true });
  const existingMediumPosts = await findExistingMediumPosts();
  for (const item of items) await convertArticle(item, report, existingMediumPosts);
  const importedImageCount = report.imported.reduce((count, post) => count + post.images.length, 0);
  const existingImageCount = report.skipped.reduce((count, post) => count + post.localImages, 0);
  report.summary = {
    localStories: report.imported.length + report.skipped.length,
    localImages: importedImageCount + existingImageCount,
    emptyAltText: [...report.imported, ...report.skipped].reduce((count, post) => count + post.emptyAltText, 0),
    failedDownloads: report.failedDownloads.length,
  };
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Imported ${report.imported.length} stories and ${importedImageCount} images.`);
  if (report.skipped.length) console.log(`Skipped ${report.skipped.length} existing stories.`);
  console.log(`Report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
