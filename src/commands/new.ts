import { join } from "std/path/mod.ts";
import { decodeBase64 } from "std/encoding/base64.ts";

import {
  anotherPost,
  blogPage,
  favicon,
  feed,
  gitignore,
  headElement,
  helloWorldPost,
  indexPage,
  logo,
  mainCSS,
  notFoundPage,
  punchJson,
  siteContents,
} from "../utils/template.ts";

interface NewSiteOpts {
  force: boolean;
}

function createDirs(path: string) {
  Deno.mkdirSync(path, { recursive: true });
  Deno.mkdirSync(join(path, "pages", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "public"), { recursive: true });
  Deno.mkdirSync(join(path, "contents", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "elements"), { recursive: true });
  Deno.mkdirSync(join(path, "css"), { recursive: true });
  Deno.mkdirSync(join(path, "js"), { recursive: true });
  Deno.mkdirSync(join(path, "images"), { recursive: true });
  Deno.mkdirSync(join(path, "feeds"), { recursive: true });
}

function copyTemplates(path: string, force: boolean) {
  // images/punch-logo.svg

  const writeTextFile = async (p: string, content: string) => {
    const textEncoder = new TextEncoder();
    await writeFile(p, textEncoder.encode(content));
  };

  const writeFile = async (p: string, content: Uint8Array) => {
    try {
      await Deno.writeFile(
        p,
        content,
        { createNew: !force },
      );
    } catch (e) {
      if (e instanceof Deno.errors.AlreadyExists) {
        throw new Error(
          `${p} alrady exists. If you wish to overwrite existing files run the command with --force option.`,
        );
      } else {
        throw e;
      }
    }
  };

  return Promise.all([
    writeTextFile(
      join(path, ".gitignore"),
      gitignore,
    ),

    writeTextFile(
      join(path, "punch.json"),
      punchJson,
    ),
    writeTextFile(
      join(path, "css", "main.css"),
      mainCSS,
    ),
    writeTextFile(
      join(path, "contents", "site.json"),
      siteContents,
    ),
    writeTextFile(
      join(path, "feeds", "rss.xml"),
      feed,
    ),
    writeTextFile(
      join(path, "elements", "head.html"),
      headElement,
    ),
    writeTextFile(
      join(path, "pages", "index.html"),
      indexPage,
    ),
    writeTextFile(
      join(path, "pages", "404.html"),
      notFoundPage,
    ),
    writeTextFile(
      join(path, "pages", "blog", "_slug_.html"),
      blogPage,
    ),
    writeTextFile(
      join(path, "contents", "blog", "hello-world.md"),
      helloWorldPost,
    ),
    writeTextFile(
      join(path, "contents", "blog", "another-post.md"),
      anotherPost,
    ),
    writeFile(
      join(path, "public", "favicon.ico"),
      decodeBase64(favicon),
    ),
    writeFile(
      join(path, "images", "logo.png"),
      decodeBase64(logo),
    ),
  ]);
}

async function createDefaultSite(path: string, force: boolean) {
  try {
    createDirs(path);
    await copyTemplates(path, force);
    console.log(`Site created!\nTo start the dev server run:\ncd ${join(Deno.cwd(), path)}; punch dev`);
  } catch (e) {
    console.error(e);
  }
}

export async function newSite(
  path: string,
  opts: NewSiteOpts,
): Promise<void> {
  if (!path) {
    console.error(
      `Need a name for the site directory (use '.' to create the site in current directory)`,
    );
    return;
  }
  await createDefaultSite(path, opts.force);
}
