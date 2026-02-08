# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static personal website (tom.counsell.org) deployed on Cloudflare Pages. Content is authored in Markdown in `src/` and compiled to HTML5 using a Deno build script with Mustache templates.

## Build

```sh
deno task build
```

This runs `build.ts` which:
1. Empties `public/`
2. Walks `src/` recursively
3. For `.md` files: parses YAML frontmatter, renders markdown with `marked`, applies Mustache template, writes `.html` to `public/`
4. For non-`.md` files: copies to `public/` preserving paths (skipping `.html` files when a `.md` with the same name exists)

Requires `deno` to be installed locally.

## Deployment

Deployed via Cloudflare Pages. Configuration is in `wrangler.toml` — the `public/` directory is the site root (`pages_build_output_dir`).

Push to `master` on GitHub to deploy. Cloudflare Pages headers and redirects are in `src/_headers` and `src/_redirects`.

## Architecture

- `src/` — all source content
  - `.md` files with YAML frontmatter are rendered to HTML via templates
  - All other files are copied verbatim to `public/`
  - `index.css` and `cv.css` are stylesheets
  - `Static/` and `Attachment/` hold images
  - `view/` contains wiki pages (converted from legacy HTML to markdown)
  - `_headers` configures caching (1-year for static assets)
  - `_redirects` maps old wiki URLs to current paths
- `templates/` — Mustache templates (currently just `default.mustache`)
- `build.ts` — the build script
- `deno.json` — Deno configuration with build task
- `public/` — generated output, committed to git, served by Cloudflare Pages
- `wrangler.toml` — Cloudflare Pages deployment config

## Frontmatter Schema

```yaml
---
title: Page Title           # used in <title> and <h1>
template: default            # optional, which .mustache template to use
css:                         # optional, stylesheet(s)
  - /index.css
date: 2013-08-12             # optional
---
```

## Workflow

1. Edit `.md` files in `src/`
2. Run `deno task build`
3. Commit both the `src/` source and generated `public/`
4. Push to deploy
