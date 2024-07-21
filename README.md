# Punch

## A fast and simple web site builder

### A Static Site Builder + Headless CMS + Web Server

### Features

* Blazing fast to build
  - compare with benchmark https://github.com/zachleat/bench-framework-markdown
* Optimized, low bandwith sites
* Static-site generation
* Single binary CLI to run
* Zero config (sensible defaults)
* Built-in support for Tailwind
* Built-in support for TypeScript, JS imports
* Automatic asset minification and fingerprinting
* Easy RSS feed generation
* Serve multiple websites with different domains (with SSL)
* On-demand Rendering on server-side
* Content API (works as a headless CMS for client-side rendering)
* Website contents can be stored in different formats and sources (JSON, Markdown, CSV, or external sources like Notion)
* Extendable using plugins
* SQLite DB of contents available for direct access during build and runtime
* Compliant with Web Vitals recommendations https://web.dev/articles/vitals
* Automatic sitemap generation
* Host it anywhere Vercel, Netlify, GitHub Pages, S3, or VPS

Future releases:
* Single command publish to punch.host
* Image optimizations
* Font optimizations
* Support for diagrams in markdown content (mermaid)
* Opengraph images with Resvg
* Speculative Loading API
* Full-text search
* Migrate Jekyll, 11ty, Astro, and Hugo sites
* Easy A/B testing
* Support for i18n (multi-language sites)
* Immutable builds
  - serve can choose which build to use
  - build refs are stored in DB

### TODO

* on-demand rendering [~]
  - write rendered resources to disk
* Expose Punch.query API (support joins, count)
* TS files as entrypoints
* Sourcemaps
* tsconfig
* Publish to JSR (so it can be imported for customization)
* punch upgrade command

### What you can build with Punch?

* Marketing sites
* Personal Websites
* Blogs
* E-commerce stores (Shopify)
* Emails & Newsletters
* Documentation sites
* Mini apps

### How it works?

-- TODO

#### CLI

* punch new - create a new site (support --template)
* punch dev - runs the site in dev mode (auto-reload on changes to data/, public/ or fragments/)
* punch build - generates a static site suitable for hosting
* punch serve - serves the static site in production mode with on-demand rendering and HTTP API (suitable for self-hosting)
* punch publish - publish to punch.site
* punch import - Imports any existing website and converts it to a Punch site
