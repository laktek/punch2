import { join, relative } from "@std/path";
import { walk } from "@std/fs";
import { decodeBase64 } from "@std/encoding";

interface NewSiteOpts {
  force: boolean;
}

function createDirs(path: string) {
  Deno.mkdirSync(path, { recursive: true });
  Deno.mkdirSync(join(path, "pages", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "public"), { recursive: true });
  Deno.mkdirSync(join(path, "contents", "blog"), { recursive: true });
  Deno.mkdirSync(join(path, "partials"), { recursive: true });
  Deno.mkdirSync(join(path, "css"), { recursive: true });
  Deno.mkdirSync(join(path, "js"), { recursive: true });
  Deno.mkdirSync(join(path, "images"), { recursive: true });
  Deno.mkdirSync(join(path, "feeds"), { recursive: true });
}

async function copyTemplates(path: string, force: boolean) {
  const templateDir = join(import.meta.dirname!, "../../template");
  const promises = [];
  for await (const entry of walk(templateDir)) {
    if (entry.isFile) {
      const relPath = relative(templateDir, entry.path);
      promises.push(
        Deno.copyFile(
          entry.path,
          join(path, relPath),
        ),
      );
    }
  }

  return Promise.all(promises);
}

async function createDefaultSite(path: string, force: boolean) {
  try {
    createDirs(path);
    await copyTemplates(path, force);
    console.log(
      `Site created!\nExplore site files & directories:\ncd ${path}\nThen start the dev server:\npunch dev`,
    );
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
