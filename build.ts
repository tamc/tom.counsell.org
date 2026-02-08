import { walk } from "jsr:@std/fs/walk";
import { parse as parseYaml } from "jsr:@std/yaml";
import { join, relative, dirname, extname, basename } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { Marked } from "npm:marked";
import Mustache from "npm:mustache";
import { autolink, validateNoDuplicateTitlesInSameDir, type PageInfo } from "./autolinker.ts";

const SRC_DIR = "src";
const OUT_DIR = "public";
const TEMPLATES_DIR = "templates";
const BASE_URL = "https://tom.counsell.org";

// --- Frontmatter parsing ---

interface Frontmatter {
  title?: string;
  template?: string;
  css?: string[];
  date?: string;
  redirect_to?: string;
  [key: string]: unknown;
}

function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  const frontmatter = parseYaml(match[1]) as Frontmatter;
  // Normalize css to always be an array
  if (frontmatter.css && !Array.isArray(frontmatter.css)) {
    frontmatter.css = [frontmatter.css as unknown as string];
  }
  return { frontmatter, body: match[2] };
}

// --- Markdown rendering ---

const marked = new Marked({
  gfm: true,
});

function renderMarkdown(md: string): string {
  return marked.parse(md) as string;
}

// --- Template rendering ---

const templateCache = new Map<string, string>();

async function getTemplate(name: string): Promise<string> {
  if (templateCache.has(name)) {
    return templateCache.get(name)!;
  }
  const path = join(TEMPLATES_DIR, `${name}.mustache`);
  const content = await Deno.readTextFile(path);
  templateCache.set(name, content);
  return content;
}

// --- Build ---

async function emptyDir(dir: string): Promise<void> {
  try {
    for await (const entry of Deno.readDir(dir)) {
      await Deno.remove(join(dir, entry.name), { recursive: true });
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      await ensureDir(dir);
    } else {
      throw e;
    }
  }
}

// --- Site index generation ---

function generateSiteIndexContent(pages: { title: string; path: string }[]): string {
  // Sort pages alphabetically by title
  const sorted = [...pages].sort((a, b) =>
    a.title.localeCompare(b.title, "en", { sensitivity: "base" })
  );

  // Group by first letter
  const groups = new Map<string, { title: string; path: string }[]>();
  for (const page of sorted) {
    const letter = page.title[0].toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(page);
  }

  // Build HTML
  const letters = [...groups.keys()].sort();
  let html = '<nav class="site-index-nav"><p>';
  html += letters.map((l) => `<a href="#letter-${l}">${l}</a>`).join(" ");
  html += "</p></nav>\n";

  for (const letter of letters) {
    html += `<h2 id="letter-${letter}">${letter}</h2>\n<ul>\n`;
    for (const page of groups.get(letter)!) {
      html += `<li><a href="${page.path}">${page.title}</a></li>\n`;
    }
    html += "</ul>\n";
  }

  return html;
}

// --- Date formatting ---

function formatDate(date: unknown): string | undefined {
  if (!date) return undefined;
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  return String(date);
}

// --- Sitemap generation ---

function generateSitemap(
  pages: { path: string; date?: string }[],
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const page of pages) {
    xml += "  <url>\n";
    xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
    if (page.date) {
      xml += `    <lastmod>${page.date}</lastmod>\n`;
    }
    xml += "  </url>\n";
  }
  xml += "</urlset>\n";
  return xml;
}

// --- Main build ---

interface CollectedPage {
  rel: string;
  srcPath: string;
  frontmatter: Frontmatter;
  body: string;
  outPath: string;
  /** The URL path from root, e.g. "/view/History.html" */
  urlPath: string;
  title: string;
  metadataOnly: boolean;
}

async function build() {
  console.log("Building site...");

  // Empty output directory
  await emptyDir(OUT_DIR);

  // Collect all files, separating .md from others
  const mdFiles: { rel: string; path: string }[] = [];
  const copyFiles: { rel: string; path: string }[] = [];

  for await (const entry of walk(SRC_DIR, { includeDirs: false })) {
    const rel = relative(SRC_DIR, entry.path);
    if (extname(entry.path) === ".md") {
      mdFiles.push({ rel, path: entry.path });
    } else {
      copyFiles.push({ rel, path: entry.path });
    }
  }

  // Build set of output paths that .md files will produce
  const mdOutputPaths = new Set(
    mdFiles.map((f) => f.rel.replace(/\.md$/, ".html").toLowerCase()),
  );

  // Copy non-.md files, skipping any .html that a .md will generate
  let copyCount = 0;
  for (const { rel, path } of copyFiles) {
    if (extname(rel) === ".html" && mdOutputPaths.has(rel.toLowerCase())) {
      continue; // .md file takes precedence
    }
    const outPath = join(OUT_DIR, rel);
    await ensureDir(dirname(outPath));
    await Deno.copyFile(path, outPath);
    copyCount++;
  }

  // --- Pass 1: Collect page info ---
  const collectedPages: CollectedPage[] = [];

  for (const { rel, path } of mdFiles) {
    const raw = await Deno.readTextFile(path);
    const { frontmatter, body } = parseFrontmatter(raw);

    const stem = basename(rel, ".md");
    const title = frontmatter.title || stem;
    const htmlRel = rel.replace(/\.md$/, ".html");
    const urlPath = "/" + htmlRel;
    const metadataOnly = !body.trim();

    collectedPages.push({
      rel,
      srcPath: path,
      frontmatter,
      body,
      outPath: join(OUT_DIR, htmlRel),
      urlPath,
      title,
      metadataOnly,
    });
  }

  // Build PageInfo list for the auto-linker
  const allPages: PageInfo[] = collectedPages.map((p) => ({
    title: p.title,
    path: p.frontmatter.redirect_to || p.urlPath,
  }));

  // Add the site index page to allPages so it can be auto-linked
  allPages.push({ title: "Site Index", path: "/site-index.html" });

  // Validate no duplicate titles in the same directory
  validateNoDuplicateTitlesInSameDir(allPages);

  // --- Pass 2: Render pages with auto-linking ---
  let mdCount = 0;
  const renderedPages: { path: string; date?: string }[] = [];

  for (const page of collectedPages) {
    if (page.metadataOnly) continue; // skip metadata-only pages

    let content = renderMarkdown(page.body);
    content = autolink(content, allPages, page.frontmatter.redirect_to || page.urlPath);

    const templateName = (page.frontmatter.template as string) || "default";
    const template = await getTemplate(templateName);

    const html = Mustache.render(template, {
      ...page.frontmatter,
      content,
    });

    await ensureDir(dirname(page.outPath));
    await Deno.writeTextFile(page.outPath, html);
    mdCount++;

    renderedPages.push({
      path: page.urlPath,
      date: formatDate(page.frontmatter.date),
    });
  }

  // --- Pass 3: Generate site index ---
  const indexablePages = collectedPages
    .filter((p) => {
      // Exclude metadata-only pages that redirect to external URLs
      if (p.metadataOnly && p.frontmatter.redirect_to) {
        const url = p.frontmatter.redirect_to;
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return false;
        }
      }
      return true;
    })
    .map((p) => ({
      title: p.title,
      path: p.frontmatter.redirect_to || p.urlPath,
    }));

  const siteIndexContent = generateSiteIndexContent(indexablePages);
  const siteIndexAutolinked = autolink(siteIndexContent, allPages, "/site-index.html");

  const siteIndexTemplate = await getTemplate("default");
  const siteIndexHtml = Mustache.render(siteIndexTemplate, {
    title: "Site Index",
    css: ["/index.css"],
    content: siteIndexAutolinked,
  });

  await Deno.writeTextFile(join(OUT_DIR, "site-index.html"), siteIndexHtml);
  renderedPages.push({ path: "/site-index.html" });

  // --- Pass 4: Generate sitemap.xml ---
  const sitemapXml = generateSitemap(renderedPages);
  await Deno.writeTextFile(join(OUT_DIR, "sitemap.xml"), sitemapXml);

  console.log(
    `Done. ${mdCount} markdown files rendered, ${copyCount} files copied. Site index and sitemap generated.`,
  );
}

await build();
