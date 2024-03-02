import { assert } from "std/testing/asserts.ts";

import { getConfig } from "../config/config.ts";
import { Context, MiddlewareChain, NextFn } from "./middleware.ts";
import { Contents } from "./contents.ts";
import { Resources } from "./resources.ts";
import { AssetMap } from "../lib/asset_map.ts";
import { Renderer } from "../lib/render.ts";

Deno.test("MiddlewareChain.run", async (t) => {
  await t.step("calls all middleware in chain", async () => {
    const middleware = [];
    for (let i = 0; i < 5; i++) {
      middleware.push((
        ctx: Context,
        getNext: NextFn,
      ) => {
        ctx.request.headers.append("x-middleware", `${i}`);
        const next = getNext();
        const response = new Response("ok", {
          headers: {
            "x-middleware": ctx.request.headers.get("x-middleware") || "",
          },
        });
        const newCtx = { ...ctx, response };
        return next(newCtx, getNext);
      });
    }

    const chain = new MiddlewareChain(...middleware);
    const request = new Request(new URL("https://example.com"));
    const srcPath = "";
    const config = await getConfig();
    const contents = new Contents();
    const resources = new Resources();

    const renderCtx = {
      srcPath,
      config,
      contents,
    };
    const renderer = await Renderer.init(renderCtx);
    const assetMap = new AssetMap(config, renderer);

    const res = await chain.run({
      request,
      srcPath,
      config,
      contents,
      resources,
      renderer,
      assetMap,
    });

    const headerVal = res.headers.get("x-middleware");
    assert(
      headerVal === "0, 1, 2, 3, 4",
      `expected x-middleware header to be [0, 1, 2, 3, 4] got ${headerVal}`,
    );
  });
});
