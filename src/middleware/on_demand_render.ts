import { extname, join, resolve } from "std/path/mod.ts";
import { contentType } from "std/media_types/mod.ts";

import { Context, NextFn } from "../lib/middleware.ts";
import { Output, Renderer } from "../lib/render.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { routeWithContentHash } from "../utils/content_hash.ts";
import { Resource } from "../lib/resources.ts";

export default async function (ctx: Context, next: NextFn) {
  // if there's already a response, skip on-demand-render
  if (ctx.response) {
    return next()(ctx, next);
  }

  const { srcPath, config, contents, resources, request } = ctx;

  // setup renderer
  const renderCtx = {
    srcPath,
    config,
    contents,
  };
  let renderer: Renderer;
  if (config.modifiers?.renderer) {
    const { renderer: customRenderer } = await import(
      join(srcPath, config.modifiers?.renderer)
    );
    renderer = await customRenderer.init(renderCtx);
  } else {
    renderer = await Renderer.init(renderCtx);
  }

  const newCtx = { ...ctx };

  // render route
  const { pathname } = new URL(request.url);
  const output = await renderer.render(pathname);

  if (output.errorStatus) {
    console.error(
      `${pathname} - ${output.errorMessage} (${output.errorStatus})`,
    );
  } else {
    // TODO: write rendered output to a file in a worker

    // TODO: refactor use of AssetMap
    const assetMap = new AssetMap(config, renderer);
    if (output.content instanceof RenderableDocument) {
      assetMap.track(output.content as RenderableDocument);
    }

    if (resources) {
      assetMap.assets.forEach((asset, route) => {
        const resource: Resource | undefined = resources.get(
          route,
        );
        const assetPath = routeWithContentHash(route, resource?.hash || "");
        const doc = output.content as RenderableDocument;
        doc.updateAssetPaths(asset.assetType, route, assetPath);
      });
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

  return next()(newCtx, next);
}
