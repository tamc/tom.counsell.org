import { assertEquals, assertThrows } from "jsr:@std/assert";
import { autolink, validateNoDuplicateTitlesInSameDir, type PageInfo } from "./autolinker.ts";

Deno.test("basic title linking in a paragraph", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<p>Read about History here.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>Read about <a href="/view/History.html">History</a> here.</p>',
  );
});

Deno.test("no self-linking", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<p>This is the History page.</p>";
  const result = autolink(html, pages, "/view/History.html");
  assertEquals(result, "<p>This is the History page.</p>");
});

Deno.test("no linking inside <a> elements", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = '<p><a href="/other">History link</a> and History outside.</p>';
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p><a href="/other">History link</a> and <a href="/view/History.html">History</a> outside.</p>',
  );
});

Deno.test("no linking inside <code> elements", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<p><code>History</code> and History outside.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p><code>History</code> and <a href="/view/History.html">History</a> outside.</p>',
  );
});

Deno.test("no linking inside <pre> elements", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<pre>History</pre><p>History outside.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<pre>History</pre><p><a href="/view/History.html">History</a> outside.</p>',
  );
});

Deno.test("no linking inside heading elements", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<h1>History</h1><h2>History</h2><h3>History</h3><p>History here.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<h1>History</h1><h2>History</h2><h3>History</h3><p><a href="/view/History.html">History</a> here.</p>',
  );
});

Deno.test("no linking inside <script> and <style> elements", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<script>var x = 'History';</script><style>.History{}</style><p>History here.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<script>var x = \'History\';</script><style>.History{}</style><p><a href="/view/History.html">History</a> here.</p>',
  );
});

Deno.test("longest-first matching", () => {
  const pages: PageInfo[] = [
    { title: "Some", path: "/some.html" },
    { title: "Some copying is great", path: "/some-copying.html" },
  ];
  const html = "<p>Some copying is great and Some more text.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p><a href="/some-copying.html">Some copying is great</a> and <a href="/some.html">Some</a> more text.</p>',
  );
});

Deno.test("every occurrence linked, not just first", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<p>History is fun. History is great.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p><a href="/view/History.html">History</a> is fun. <a href="/view/History.html">History</a> is great.</p>',
  );
});

Deno.test("case-insensitive matching", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  const html = "<p>Read about history here and HISTORY there.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>Read about <a href="/view/History.html">history</a> here and <a href="/view/History.html">HISTORY</a> there.</p>',
  );
});

Deno.test("titles with regex special characters are escaped", () => {
  const pages: PageInfo[] = [
    { title: "C++ Programming", path: "/cpp.html" },
  ];
  const html = "<p>Learn C++ Programming today.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>Learn <a href="/cpp.html">C++ Programming</a> today.</p>',
  );
});

Deno.test("redirect_to paths used as href", () => {
  const pages: PageInfo[] = [
    { title: "Old Page", path: "https://example.com/old" },
  ];
  const html = "<p>See Old Page for details.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>See <a href="https://example.com/old">Old Page</a> for details.</p>',
  );
});

Deno.test("empty HTML returns unchanged", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
  ];
  assertEquals(autolink("", pages, "/index.html"), "");
  assertEquals(autolink("   ", pages, "/index.html"), "   ");
});

Deno.test("duplicate titles: closest page wins (same folder preferred)", () => {
  const pages: PageInfo[] = [
    { title: "Notes", path: "/a/b/notes.html" },
    { title: "Notes", path: "/x/y/notes.html" },
  ];
  const html = "<p>See Notes for details.</p>";
  // selfPath is in /a/b/ so should prefer /a/b/notes.html
  const result = autolink(html, pages, "/a/b/page.html");
  assertEquals(
    result,
    '<p>See <a href="/a/b/notes.html">Notes</a> for details.</p>',
  );
});

Deno.test("duplicate titles: farther page when self is in different folder", () => {
  const pages: PageInfo[] = [
    { title: "Notes", path: "/a/b/notes.html" },
    { title: "Notes", path: "/x/y/notes.html" },
  ];
  const html = "<p>See Notes for details.</p>";
  // selfPath is in /x/y/ so should prefer /x/y/notes.html
  const result = autolink(html, pages, "/x/y/page.html");
  assertEquals(
    result,
    '<p>See <a href="/x/y/notes.html">Notes</a> for details.</p>',
  );
});

Deno.test("duplicate titles in same folder: build error", () => {
  const pages: PageInfo[] = [
    { title: "Notes", path: "/a/b/notes.html" },
    { title: "notes", path: "/a/b/other-notes.html" },
  ];
  assertThrows(
    () => validateNoDuplicateTitlesInSameDir(pages),
    Error,
    "Duplicate title",
  );
});

Deno.test("no duplicate title error for different directories", () => {
  const pages: PageInfo[] = [
    { title: "Notes", path: "/a/notes.html" },
    { title: "Notes", path: "/b/notes.html" },
  ];
  // Should not throw
  validateNoDuplicateTitlesInSameDir(pages);
});

Deno.test("word boundary prevents partial matching", () => {
  const pages: PageInfo[] = [
    { title: "PhD", path: "/view/Phd.html" },
  ];
  const html = "<p>My PhD is complete.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>My <a href="/view/Phd.html">PhD</a> is complete.</p>',
  );
});

Deno.test("multiple different pages linked in same text", () => {
  const pages: PageInfo[] = [
    { title: "History", path: "/view/History.html" },
    { title: "Programming", path: "/programming/index.html" },
  ];
  const html = "<p>See History and Programming sections.</p>";
  const result = autolink(html, pages, "/index.html");
  assertEquals(
    result,
    '<p>See <a href="/view/History.html">History</a> and <a href="/programming/index.html">Programming</a> sections.</p>',
  );
});
