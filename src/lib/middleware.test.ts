import { assert } from "std/testing/asserts.ts";

import { getConfig } from "../config/config.ts";
import { Context, MiddlewareChain, NextFn } from "./middleware.ts";

Deno.test("MiddlewareChain.run", async (t) => {
  await t.step("calls all middleware in chain", async () => {
    const middleware = [];
    for (let i = 0; i < 5; i++) {
      middleware.push((
        ctx: Context,
        getNext: NextFn,
      ) => {
        req.headers.append("x-middleware", `${i}`);
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
    const req = new Request(new URL("https://example.com"));
    const srcPath = "";
    const config = await getConfig();
    const res = await chain.run(req, srcPath, config);

    const headerVal = res.headers.get("x-middleware");
    assert(
      headerVal === "0, 1, 2, 3, 4",
      `expected x-middleware header to be [0, 1, 2, 3, 4] got ${headerVal}`,
    );
  });
});
