import { join, resolve } from "@std/path";

import { Context, NextFn } from "../lib/middleware.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { RenderOptions } from "../lib/render.ts";

const defaultPageNotFound =
  `<html><head><title>Page Not Found</title></head><body><h1>Page Not Found</h1></body></html>`;

async function getPageNotFound(
  ctx: Context,
): Promise<Uint8Array> {
  const { assetMap, devMode, srcPath, config, renderer } = ctx;

  try {
    const pathname = "/404";
    if (ctx.devMode && renderer) {
      const renderOpts: RenderOptions = {};
      // in dev mode, we send the `used_by` option for assets
      const asset = assetMap.assets.get(pathname);
      if (asset) {
        renderOpts.usedBy = asset.usedBy;
      }
      const output = await renderer.render(pathname, renderOpts);
      if (output.content instanceof RenderableDocument) {
        assetMap.track(output.content as RenderableDocument);

        const contentStr = output.content!.toString();
        const encoded = (new TextEncoder()).encode(contentStr);
        return encoded;
      } else {
        throw new Error("invalid 404 page - rendering the default");
      }
    } else {
      const destPath = resolve(srcPath, config.output!);
      return await Deno.readFile(join(destPath, "404.html"));
    }
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
  const newCtx = { ...ctx };
  if (!ctx.response) {
    newCtx.response = new Response(
      await getPageNotFound(ctx),
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
