/// <reference lib="dom" />
import { parseHTML } from "npm:linkedom";

export interface PageInfo {
  title: string;
  path: string;
}

const SKIP_TAGS = new Set([
  "A",
  "PRE",
  "CODE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "SCRIPT",
  "STYLE",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Count the number of shared leading path segments between two paths.
 * E.g. "/a/b/page.html" and "/a/b/other.html" share 2 segments ("a", "b").
 */
function pathProximity(selfPath: string, candidatePath: string): number {
  const selfParts = selfPath.split("/").filter(Boolean);
  const candParts = candidatePath.split("/").filter(Boolean);
  // Compare directory segments (exclude filename)
  const selfDir = selfParts.slice(0, -1);
  const candDir = candParts.slice(0, -1);
  let shared = 0;
  for (let i = 0; i < Math.min(selfDir.length, candDir.length); i++) {
    if (selfDir[i] === candDir[i]) {
      shared++;
    } else {
      break;
    }
  }
  return shared;
}

function isInsideSkipElement(node: Node): boolean {
  let current = node.parentNode;
  while (current) {
    if (
      current.nodeType === 1 &&
      SKIP_TAGS.has((current as Element).tagName)
    ) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

interface Candidate {
  title: string;
  path: string;
  regex: RegExp;
}

/**
 * Build the list of link candidates from pages, resolving duplicates by
 * proximity to selfPath. Sorted longest title first.
 */
function buildCandidates(pages: PageInfo[], selfPath: string): Candidate[] {
  // Group by lowercase title
  const groups = new Map<string, PageInfo[]>();
  for (const page of pages) {
    if (page.path === selfPath) continue; // no self-linking
    const key = page.title.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(page);
  }

  const candidates: Candidate[] = [];
  for (const [, group] of groups) {
    // Pick the closest page for this title
    group.sort((a, b) => {
      const proxDiff = pathProximity(selfPath, b.path) -
        pathProximity(selfPath, a.path);
      if (proxDiff !== 0) return proxDiff;
      // Tie-break: shorter total path
      return a.path.length - b.path.length;
    });
    const best = group[0];
    candidates.push({
      title: best.title,
      path: best.path,
      regex: new RegExp(`\\b(${escapeRegex(best.title)})\\b`, "gi"),
    });
  }

  // Sort longest title first
  candidates.sort((a, b) => b.title.length - a.title.length);
  return candidates;
}

/**
 * Process a single text node, attempting to match candidates starting from
 * candidateIndex. When a match is found, splits the text node into
 * [before][link][after] and recursively processes before (remaining shorter
 * candidates) and after (all candidates from candidateIndex onward).
 */
function processTextNode(
  textNode: Text,
  candidates: Candidate[],
  candidateIndex: number,
  document: Document,
): void {
  const text = textNode.textContent || "";
  if (!text.trim()) return;

  for (let i = candidateIndex; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (candidate.title.length > text.length) continue;

    // Reset regex lastIndex
    candidate.regex.lastIndex = 0;
    const match = candidate.regex.exec(text);
    if (!match) continue;

    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;
    const parent = textNode.parentNode!;

    // Create: [before text] [<a>matched</a>] [after text]
    const beforeText = text.substring(0, matchStart);
    const matchedText = match[0];
    const afterText = text.substring(matchEnd);

    const link = document.createElement("a");
    link.setAttribute("href", candidate.path);
    link.textContent = matchedText;

    // Replace the text node with the three parts
    if (afterText) {
      const afterNode = document.createTextNode(afterText);
      parent.insertBefore(afterNode, textNode.nextSibling);
      // Recursively process after node for all candidates from this index
      processTextNode(afterNode, candidates, i, document);
    }

    parent.insertBefore(link, textNode.nextSibling || null);

    if (beforeText) {
      textNode.textContent = beforeText;
      // Recursively process before node for remaining (shorter) candidates
      processTextNode(textNode, candidates, i + 1, document);
    } else {
      parent.removeChild(textNode);
    }

    return; // Done with this text node
  }
}

/**
 * Collect all text nodes in the document that are not inside skip elements.
 */
function collectTextNodes(root: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = (node: Node) => {
    if (node.nodeType === 3) {
      // Text node
      if (!isInsideSkipElement(node)) {
        textNodes.push(node as Text);
      }
    } else if (node.nodeType === 1) {
      // Don't descend into skip elements
      if (!SKIP_TAGS.has((node as Element).tagName)) {
        for (const child of Array.from(node.childNodes)) {
          walker(child);
        }
      }
    }
  };
  walker(root);
  return textNodes;
}

/**
 * Auto-link page titles within HTML content.
 *
 * @param html - The HTML content to process
 * @param pages - All pages in the site
 * @param selfPath - The path of the current page (to avoid self-linking)
 * @returns The HTML with titles wrapped in links
 */
export function autolink(
  html: string,
  pages: PageInfo[],
  selfPath: string,
): string {
  if (!html || !html.trim()) return html;

  const candidates = buildCandidates(pages, selfPath);
  if (candidates.length === 0) return html;

  const { document } = parseHTML(`<!DOCTYPE html><html><body>${html}</body></html>`);

  // Collect text nodes before modifying the DOM
  const textNodes = collectTextNodes(document.body);

  // Process each text node
  for (const textNode of textNodes) {
    processTextNode(textNode, candidates, 0, document);
  }

  return document.body.innerHTML;
}

/**
 * Validate that no two pages share the same title (case-insensitive) in the
 * same directory. Throws an error if duplicates are found.
 */
export function validateNoDuplicateTitlesInSameDir(pages: PageInfo[]): void {
  const seen = new Map<string, PageInfo>();
  for (const page of pages) {
    const dir = page.path.substring(0, page.path.lastIndexOf("/") + 1);
    const key = `${dir}::${page.title.toLowerCase()}`;
    if (seen.has(key)) {
      const existing = seen.get(key)!;
      throw new Error(
        `Duplicate title "${page.title}" in the same directory: "${existing.path}" and "${page.path}"`,
      );
    }
    seen.set(key, page);
  }
}
