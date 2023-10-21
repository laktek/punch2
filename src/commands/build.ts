import { fromFileUrl, join, relative, resolve } from "std/path/mod.ts";
import { walk } from "std/fs/mod.ts";

import { getConfig } from "../config/config.ts";

async function copyPublicFiles(
  publicPath: string,
  dest: string,
): Promise<void> {
  for await (const entry of walk(publicPath)) {
    const relPath = relative(publicPath, entry.path);

    // skip dotfiles
    if (entry.name.startsWith(".")) {
      continue;
    }

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
}

interface BuildOpts {
  srcPath: string;
  destPath: string;
  configPath?: string;
}

export async function build(opts: BuildOpts): Promise<boolean> {
  const { srcPath, destPath, configPath } = opts;

  // read the punch config
  const config = await getConfig(configPath ?? join(srcPath, "punch.json"));

  // copy public files
  const publicPath = join(srcPath, config.dirs!.public!);
  await copyPublicFiles(publicPath, destPath);

  // prepare contents

  // generate pages

  return true;
}
