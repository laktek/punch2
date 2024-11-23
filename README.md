# Punch

## A fast and simple web site builder

### A Static Site Builder + Headless CMS + Web Server

### Features

* Blazing fast to build
  - compare with benchmark https://github.com/zachleat/bench-framework-markdown
* Static-site generation
* Single binary CLI to run
* Zero config (sensible defaults)
* Built-in support for Tailwind
* Built-in support for TypeScript, JS imports
* Automatic asset minification and fingerprinting
* Only build assets that are used in pages
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

### TODO

* Sourcemap for css and JS
* CI tests for Windows
* Support for resizing images (for srcset)
* Internal redirects for images loaded via CSS / JS
* auto-redirect www to host
* on-demand rendering [~]
  - write rendered resources to disk
* Content API config (CORS, auth, block endpoints)
* Better error handling
  - failing to render HTML template
    -- (dev should show helpful error page, build should fail)
* CSP header middleware
* ability to import .ts files directly in script tags
* Publish to JSR (so it can be imported for customization)
* punch upgrade command

* Single command publish (to punch.host and other providers)
* Font optimizations
* Support for diagrams in markdown content (mermaid)
* Opengraph images with Resvg
* Speculative Loading API
* Full-text / Semantic search
* Migrate Jekyll, 11ty, Astro, and Hugo sites
* Easy A/B testing
* Support for i18n (multi-language sites)
* Middleware to render-partials (htmx use case)
* Immutable builds
  - serve can choose which build to use
  - build refs are stored in DB
* Content as txt files https://x.com/alexalbert__/status/1857457290917589509

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
