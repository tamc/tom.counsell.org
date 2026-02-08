import { walk } from "jsr:@std/fs/walk";
import { parse as parseYaml } from "jsr:@std/yaml";
import { join, relative, dirname, extname } from "jsr:@std/path";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { Marked } from "npm:marked";
import Mustache from "npm:mustache";

const SRC_DIR = "src";
const OUT_DIR = "public";
const TEMPLATES_DIR = "templates";

// --- Frontmatter parsing ---

interface Frontmatter {
  title?: string;
  template?: string;
  css?: string[];
  date?: string;
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
    mdFiles.map(f => f.rel.replace(/\.md$/, ".html").toLowerCase())
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

  // Render .md files (after copies, so they win any conflicts)
  let mdCount = 0;
  for (const { rel, path } of mdFiles) {
    const raw = await Deno.readTextFile(path);
    const { frontmatter, body } = parseFrontmatter(raw);
    const content = renderMarkdown(body);

    const templateName = (frontmatter.template as string) || "default";
    const template = await getTemplate(templateName);

    const html = Mustache.render(template, {
      ...frontmatter,
      content,
    });

    const outPath = join(OUT_DIR, rel.replace(/\.md$/, ".html"));
    await ensureDir(dirname(outPath));
    await Deno.writeTextFile(outPath, html);
    mdCount++;
  }

  console.log(`Done. ${mdCount} markdown files rendered, ${copyCount} files copied.`);
}

await build();
