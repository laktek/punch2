import { join } from "std/path/mod.ts";

interface NewSiteOpts {
  template: string;
}

function createDirs(path: string) {
  Deno.mkdirSync(path, { recursive: true });
  Deno.mkdirSync(join(path, "pages", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "public"));
  Deno.mkdirSync(join(path, "contents", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "elements"));
  Deno.mkdirSync(join(path, "css"));
  Deno.mkdirSync(join(path, "js"));
  Deno.mkdirSync(join(path, "images"));
  Deno.mkdirSync(join(path, "feeds"));
}

function createGitIgnore(path: string) {
  Deno.writeTextFileSync(
    join(path, ".gitignore"),
    gitignore,
  );
}

async function copyTemplates(path: string) {
  const gitignore = `# default output directory
dist/

# npm dependencies
node_modules/`;

  const mainCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

  // element - head
  const headElement = `
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ title }} - {{ site.title }}</title>
    <link href="images/favicon.ico" rel="icon" type="image/x-icon" />
    <link rel="stylesheet" href="/css/main.css" />
    <meta property="og:title" content="{{ title }}" />
    <meta name="description" content="{{ site.description }}" />
    <meta name="og:description" content="{{ site.description }}" />
    <meta property="og:locale" content="{{ site.language }}" />
    <meta property="og:type" content="website" />
    <link rel="alternate" type="application/rss+xml" title="{{ site.title }}" href="/feeds/rss.xml">
  </head>`;

  // index
  const indexPage = `<!doctype html>
<html lang={{ site.language }}>
  {{> head site=site title="Home"}}
  <body>
    <div>
      <h1 class="text-3xl">Welcome to {{ site.title }}</h1>
      <p>{{ site.description }}</p>
    </div>
    <footer>
      <p>Powered by Punch</p>
    </footer>
  </body>
</html>`;

  // blog page template
  const blogPage = `<!doctype html>
<html lang={{ site.language }}>
  {{#with (get_one "blog" slug=route.slug)}}
    {{> head site=site title=title}}

    <body>
      <h2 class="text-3xl">{{ title }}</h2>
      <div class="text-lg"><a class="underline" href="{{authors.[0].url}}">{{ authors.[0].name}}</a></div>
      <div>
        {{ content }}
      </div>
    </body>
  {{/with}}
</html>
`;

  // 404
  const notFoundPage = `<!doctype html>
<html lang={{ site.language }}>
  {{> head site=site title="Page Not Found"}}

  <body>
    <div>
      <h1 class="text-3xl">Page Not Found</h1>
      <p>Page you tried to access doesn't exist</p>
    </div>
    <footer>
      <p>Powered by Punch</p>
    </footer>
  </body>
</html>`;

  // hello world blog post
  const helloWorldPost = `---
title: "Hello World"
authors:
  - name: Lakshan Perera
    url: https://laktek.com
publishDate: 2024-01-01T10:00-07:00
description: "Sample blog post for Punch"
slug: "hello-world"
published: true
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut odio lacus, sagittis sit amet est ultricies, varius tincidunt neque. Vivamus venenatis magna eget vulputate luctus. Nunc vitae rutrum justo, ut gravida libero.`;

  // public/favicon

  // images/punch-logo.svg

  // rss feed
  const feed = `<rss version="2.0">
  <channel>
    <title>{{ site.title }}</title>
    <link>{{ site.url }}</link>
    <description>{{ site.description }}</description>
    <pubDate>{{ blog.publishDate }}</pubDate>
    <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
    <generator>https://github.com/laktek/punch</generator>
    <language>{{ site.language }}</language>

    {{#each (get_all "blog" order_by="created_at desc")}}
      <item>
        <title>
          <![CDATA[ {{ title }} ]]>
        </title>
        <link>{{../site.url}}/{{ slug }}</link>
        <pubDate>{{ publishDate }}</pubDate>
        <description>
          <![CDATA[ {{ content }} ]]>
        </description>
      </item>
    {{/each}}
  </channel>
</rss>
`;

  // contents
  const siteContents = {
    title: "My Site",
    description: "This site was generated using Punch",
    url: "https://www.example.com",
    language: "en-US",
  };

  // punch.json
  const punchJson = {
    output: "dist",
    routes: ["/blog/hello-world", "/feeds/rss.xml"],
    redirects: {},
  };

  return Promise.all([
    Deno.writeTextFile(
      join(path, ".gitignore"),
      gitignore,
    ),

    Deno.writeTextFile(
      join(path, "punch.json"),
      JSON.stringify(punchJson, null, "\t"),
    ),
    Deno.writeTextFile(
      join(path, "css", "main.css"),
      mainCSS,
    ),
    Deno.writeTextFile(
      join(path, "contents", "site.json"),
      JSON.stringify(siteContents, null, "\t"),
    ),
    Deno.writeTextFile(
      join(path, "feeds", "rss.xml"),
      feed,
    ),
    Deno.writeTextFile(
      join(path, "elements", "head.html"),
      headElement,
    ),
    Deno.writeTextFile(
      join(path, "pages", "index.html"),
      indexPage,
    ),
    Deno.writeTextFile(
      join(path, "pages", "404.html"),
      notFoundPage,
    ),
    Deno.writeTextFile(
      join(path, "pages", "blog", "_slug_.html"),
      blogPage,
    ),
    Deno.writeTextFile(
      join(path, "contents", "blog", "hello-world.md"),
      helloWorldPost,
    ),
  ]);
}

async function createDefaultSite(path: string) {
  createDirs(path);
  await copyTemplates(path);
}

export async function newSite(
  path: string,
  opts: NewSiteOpts,
): Promise<void> {
  if (opts.template !== undefined) {
    console.error(
      "creating a new site from template is currently not supported",
    );
  }

  await createDefaultSite(path);
}
