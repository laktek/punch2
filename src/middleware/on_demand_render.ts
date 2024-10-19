import { extname, join, resolve } from "@std/path";
import { contentType } from "@std/media-types";

import { Context, NextFn } from "../lib/middleware.ts";
import { Output, Renderer, RenderOptions } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { routeWithContentHash } from "../utils/content_hash.ts";
import { Resource } from "../lib/resources.ts";

export default async function (ctx: Context, next: NextFn) {
  // if there's already a response, skip on-demand-render
  if (ctx.response) {
    return next()(ctx, next);
  }

  const {
    srcPath,
    config,
    contents,
    resources,
    request,
    devMode,
    renderer,
    assetMap,
  } = ctx;

  const newCtx = { ...ctx };

  try {
    const { pathname } = new URL(request.url);

    const renderOpts: RenderOptions = {};
    if (devMode) {
      // in dev mode, we send the `used_by` option for assets
      const asset = assetMap.assets.get(pathname);
      if (asset) {
        renderOpts.usedBy = asset.usedBy;
      }

      // prepare contents
      const contentsPath = join(srcPath, config.dirs!.contents!);
      await contents.prepare(contentsPath);
    }

    const output = await renderer.render(pathname, renderOpts);

    if (output.errorStatus) {
      console.error(
        `${pathname} - ${output.errorMessage} (${output.errorStatus})`,
      );
    } else {
      // TODO: write rendered output to a file in a worker

      // TODO: refactor use of AssetMap
      if (output.content instanceof RenderableDocument) {
        assetMap.track(output.content as RenderableDocument);

        if (!devMode && resources) {
          assetMap.assets.forEach((asset, route) => {
            const resource = resources.get(
              route,
            );
            const assetPath = routeWithContentHash(
              route,
              (resource?.hash as string) || "",
            );
            const doc = output.content as RenderableDocument;
            doc.updateAssetPaths(asset.resourceType, route, assetPath);
          });
        }
      }

      let encoded: Uint8Array;
      if (output.content instanceof Uint8Array) {
        encoded = output.content;
      } else {
        const contentStr = output.content!.toString();
        encoded = (new TextEncoder()).encode(contentStr);
      }

      const ext = extname(pathname);
      newCtx.response = new Response(encoded, {
        status: 200,
        headers: {
          "content-type": contentType(ext) || "text/html; charset=UTF-8",
        },
      });
    }
  } catch (e) {
    console.error(e);
    // since type of `e` is unknown
    if (e instanceof Error) {
      const errMsg = devMode
        ? `<html>\n
    <head>\n
      <title>Error Rendering Page</title>\n
    </head>\n
    <body>\n
      <h1>Error Rendering Page</h1>\n
      <pre><code>${e.stack || e.message}</code></pre>\n
      ${
          e.cause
            ? `<pre><code>Caused by ${(e.cause as Error).stack}</code></pre>\n`
            : ""
        }
    </body>\n
</html>`
        : `<html>\n
    <head>\n
      <title>Error Rendering Page</title>\n
    </head>\n
    <body>\n
      <h1>Error Rendering Page</h1>\n
      <p>Please check the server logs for details</p>\n
    </body>\n
</html>`;

      newCtx.response = new Response(errMsg, {
        status: 500,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    } else {
      throw e;
    }
  }

  return next()(newCtx, next);
}
