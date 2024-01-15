import { join, resolve } from "std/path/mod.ts";

import { Context, NextFn } from "../lib/middleware.ts";

const defaultPageNotFound =
  `<html><head><title>Page Not Found</title></head><body><h1>Page Not Found</h1></body></html>`;

async function getPageNotFound(
  filePath: string,
): Promise<Uint8Array> {
  try {
    return await Deno.readFile(filePath);
  } catch (e) {
    // log errors other than file not found
    if (!(e instanceof Deno.errors.NotFound)) {
      console.error(e);
    }
    const enc = new TextEncoder();
    return enc.encode(defaultPageNotFound);
  }
}

export default async function (ctx: Context, next: NextFn) {
  const destPath = resolve(ctx.srcPath, ctx.config.output!);
  let newCtx = { ...ctx };
  if (!ctx.response) {
    newCtx.response = new Response(
      await getPageNotFound(join(destPath, "404.html")),
      {
        status: 404,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      },
    );
  }

  return next()(newCtx, next);
}
