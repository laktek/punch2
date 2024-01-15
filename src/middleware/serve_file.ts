import { extname, join, resolve } from "std/path/mod.ts";
import { contentType } from "std/media_types/mod.ts";

import { Context, NextFn } from "../lib/middleware.ts";

async function getContents(filePath: string): Promise<Uint8Array | undefined> {
  try {
    return await Deno.readFile(filePath);
  } catch (e) {
    if (e.code === "EISDIR") { // instanceof Deno.errors.IsADirectory doesn't work
      // try reading the index.html
      return await getContents(join(filePath, "index.html"));
    } else if (e instanceof Deno.errors.NotFound && extname(filePath) === "") {
      // try adding an explicit .html as extension
      return await getContents(filePath + ".html");
    }
  }
}

export default async function (ctx: Context, next: NextFn) {
  const { config, request } = ctx;
  const destPath = resolve(ctx.srcPath, config.output!);
  const { pathname } = new URL(request.url);
  const filePath = join(destPath, pathname);
  const ext = extname(pathname);
  const contents = await getContents(filePath);

  const newCtx = { ...ctx };
  if (contents) {
    newCtx.response = new Response(contents, {
      status: 200,
      headers: {
        "content-type": contentType(ext) || "text/html; charset=UTF-8",
      },
    });
  }

  return next()(newCtx, next);
}
