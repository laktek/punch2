import { dirname, extname, join, relative, resolve } from "std/path/mod.ts";
import { walk } from "std/fs/mod.ts";

import { commonSkipPaths } from "./paths.ts";

export async function copyPublicFiles(
  publicPath: string,
  dest: string,
): Promise<void> {
  try {
    for await (const entry of walk(publicPath, { skip: commonSkipPaths })) {
      const relPath = relative(publicPath, entry.path);

      if (entry.isFile) {
        await Deno.copyFile(entry.path, join(dest, relPath));
      } else if (entry.isDirectory) {
        await Deno.mkdir(join(dest, relPath), { recursive: true });
      } else if (entry.isSymlink) {
        const originalPath = resolve(
          entry.path,
          "../",
          Deno.readLinkSync(entry.path),
        );
        await Deno.copyFile(originalPath, join(dest, relPath));
      }
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return;
    }
    throw e;
  }
}
