import { basename, extname } from "std/path/mod.ts";
import { walk } from "std/fs/mod.ts";

import { commonSkipPaths } from "./paths.ts";

export async function getElements(
  elementsPath: string,
  handlebarsEnv: any,
): Promise<{ [key: string]: any }> {
  const elements: { [key: string]: any } = {};

  try {
    for await (
      const entry of walk(elementsPath, {
        skip: [...commonSkipPaths],
        maxDepth: 1,
      })
    ) {
      if (entry.isFile || entry.isSymlink) {
        const ext = extname(entry.path);
        // key name has to start with alphanumeric character (a-z0-9)
        const key = basename(entry.path, ext).replace(
          /(^[^a-zA-Z0-9]+)|([^a-zA-Z0-9]+$)/g,
          "",
        );
        const raw = await Deno.readTextFile(entry.path);
        const tmpl = handlebarsEnv.compile(raw, { noEscape: true });
        elements[key] = tmpl;
      }
    }

    return elements;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return {};
    }

    throw e;
  }
}
