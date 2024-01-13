import { join, resolve } from "std/path/mod.ts";

const defaultPageNotFound =
  `<html><head><title>Page Not Found</title></head><body><h1>Page Not Found</h1></body></html>`;

async function getPageNotFound(filePath: string): Promise<Uint8Array> {
  try {
    return await Deno.readFile(filePath);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      const enc = new TextEncoder();
      return enc.encode(defaultPageNotFound);
    }
  }
}

export default async function (ctx, next) {
  const destPath = resolve(Deno.cwd(), ctx.config.output);
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
