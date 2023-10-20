import {
  fromFileUrl,
  join,
  relative,
  resolve,
} from "https://deno.land/std@0.204.0/path/mod.ts";
import { walk } from "https://deno.land/std@0.204.0/fs/mod.ts";

async function copyPublicFiles(publicPath: string, dest: string) {
  for await (const entry of walk(publicPath)) {
    const relPath = relative(publicPath, entry.path);
    if (entry.isFile) {
      await Deno.copyFile(entry.path, join(dest, relPath));
    } else if (entry.isDirectory) {
      await Deno.mkdir(join(dest, relPath), { recursive: true });
    } else if (entry.isSymlink) {
      console.log(entry.path);
      console.log(Deno.readLinkSync(entry.path));
      const originalPath = resolve(
        entry.path,
        "../",
        Deno.readLinkSync(entry.path),
      );
      console.log(originalPath);
      await Deno.copyFile(originalPath, join(dest, relPath));
    }
  }
}

export async function build(src: URL, dest: URL): Promise<boolean> {
  const srcPath = fromFileUrl(src);
  const destPath = fromFileUrl(dest);

  const publicPath = join(srcPath, "public");
  await copyPublicFiles(publicPath, destPath);

  return true;
}
