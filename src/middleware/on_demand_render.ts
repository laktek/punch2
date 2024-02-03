import { extname, join, resolve } from "std/path/mod.ts";
import { contentType } from "std/media_types/mod.ts";

import { Context, NextFn } from "../lib/middleware.ts";
import { Contents } from "../lib/contents.ts";
import { Output, Renderer } from "../lib/render.ts";

export default async function (ctx: Context, next: NextFn) {
  const { srcPath, config, request } = ctx;

  // prepare contents
  const contentsPath = join(srcPath, config.dirs!.contents!);
  // TODO: configure path for the DB
  const contents = new Contents();
  await contents.prepare(contentsPath);

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
    // TODO: Update asset paths
    // TODO: write rendered output to a file in a worker

    let encoded: Uint8Array;
    if (output.content instanceof Uint8Array) {
      encoded = output.content;
    } else {
      const contentStr = output.content!.toString();
      encoded = (new TextEncoder()).encode(contentStr);
    }

    // TODO: output should provide the content type
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
