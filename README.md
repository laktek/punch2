# Punch

## A fast and simple web site builder

### Features

* Blazing fast to build
* Optimized, low bandwith sites
* Static-site generation
* Single binary CLI to run
* Zero config (sensible defaults)
* Extendable using plugins
* Optional Server-Side Generation (SSG) & HTTP API support (works as a headless CMS for client)
* Website contents can be stored in different formats and sources (JSON, Markdown, CSV, or external sources like Notion)
* SQLite DB of contents available for direct access during build and runtime
* Static and dynamic routing
* Support for i18n (multi-language sites)
* Easy A/B testing
* Built-in support for a11y guidelines
* East to integrate with Shopify stores
* Deploy to Vercel, Netlify, GitHub Pages or self-host
* Single command publish to punch.site
* Migrate Jekyll, Astro, and Hugo sites

### What you can build with Punch?

* Marketing sites
* Personal Websites
* Blogs
* E-commerce stores
* Emails & Newsletters
* Documentation sites
* Mini apps

### How it works?

* Define a sitemap.json with all page URLs (sitemap.toml or sitemap.yaml also supported)

  [
    'index.html',
    '404.html',
    'about.html',
		'feed.rss.xml,
    'robots.txt',
    '/2023/10/15/relaunch-blog',
    '/partners/experts/foo',
    '/en/about',
    '/es/about',
  ]

* `punch build` will run a generator. Users can provide a custom generator.

### Generator interface:

  interface Context {
    path: string
    request?: Request  // only on serve mode
    referrer: string // for assets, this will be the path that requested it
    assets: Asset[] // already built assets
    contents: Contents // content DB
		cache: Cache // build cache
		custom: Map<string, string> // store custom properties
  }

  interface Asset {
    path: string,
    content: string,
    contentType: string // JS, CSS, Image, etc
  }

  interface Output {
    path: string,
    content: string
    assets: Asset[]
  }

  export function generate(context: Context): Output {
    // modify the input context
    context.content = new Content({ name: 'es'});

    // the default generate
    // return globalThis.Punch.generate(context);
  }

### Default generator:

- Check `src/pages/` for a matching page for the given path
- If cannot be found, render `src/pages/404.html` or default 404 message
- When a matching page is found,.
  - parse its HTML
  - Extract all assets -  check which ones need to be built (bundling JS/CSS, optimizing images)
  - Check for any `punch-*` element and render them. (eg: <punch-layout><h1>Title</h1><p>Text</p></punch-layout> or <punch-navbar links={ site.main.links } />)
    -- note: should make the prefix configurable. Use an array of element prefixes
  - Use handlebars to render template tags (eg: <a href={{ personal.links.instagram }}>Instagram</a>)
  - `context.content` is available as an input object for the page
- Check `src/public` and copy all files to output

### Rendering Punch elements

- getCustomElement interface

interface CustomElement {
  element: Element //valid HTML5 element
}

export function getCustomElement(name: string, attrs: Map<string, string>, children: Node, context: Context): CustomElement {
  // return CustomElement

  return globalThis.Punch.getCustomElement(name, attrs, children, context)
}

### Default Render:

- Check `/src/elements` for matching element. (eg: `src/elements/layout.html` will match `punch-layout`)
- Uses handlebars to render the template tags
- `attrs` and `children` are treated as custom helpers

Eg (layout):

<html>
  <head>
    <titile>{{attrs.title default='Hello' }}</title>
  </head>
  <body>
    {{ children }}
  </body>
</html>

Eg (navbar):

<div>
	{{#each attrs.link }}
  		<div><a href="#">{this}</a></div>
	{{/each}}
</div>

### Preparing Contents

- getContents interface

	export function getContents(): Contents {
		return contents
	}

### Default get contents implementation

- Check `/src/contents`
- any sub directory, will be created as a table. Any files will be tried to be added as entries. Directories inside it are ignored. Eg: `blogposts` directory with .md files
- top level files will create tables Eg: team.yaml will create a `team` table
- Following file types are automatically parsed: .md, .json, .yaml, .toml, .csv
- Each entry in the table will have a last_updated_at based on the file's last modified date and content_hash

### Build cache

- There is a cache DB
- After a file is built, an entry will be added. (file path, content tables used, elements used, file last modified, content hash)

#### CLI

* punch new - create a new site (support --template)
* punch dev - runs the site in dev mode (auto-reload on changes to data/, public/ or fragments/)
* punch build - generates a static site suitable for hosting
* punch serve - serves the static site in production mode with on-demand rendering and HTTP API (suitable for self-hosting)
* punch publish - publish to punch.site
* punch import - Imports any existing website and converts it to a Punch site
