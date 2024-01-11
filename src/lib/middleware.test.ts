import { assert, assertEquals } from "std/testing/asserts.ts";

import { MiddlewareChain, NextFn } from "./middleware.ts";

Deno.test("MiddlewareChain.run", async (t) => {
  await t.step("calls all middleware in chain", async () => {
    const chain = new MiddlewareChain();

    for (let i = 0; i < 5; i++) {
      const middleware = async (req: Request, next: NextFn) => {
        req.headers.append("x-middleware", `${i}`);
        const nextMiddleware = next();
        if (nextMiddleware) {
          return nextMiddleware(req, next);
        } else {
          return new Response("ok", {
            headers: {
              "x-middleware": req.headers.get("x-middleware") || "",
            },
          });
        }
      };
      chain.append(middleware);
    }

    const req = new Request(new URL("https://example.com"));
    const res = await chain.run(req);

    const headerVal = res.headers.get("x-middleware");
    assert(
      headerVal === "0, 1, 2, 3, 4",
      `expected x-middleware header to be [0, 1, 2, 3, 4] got ${headerVal}`,
    );
  });
});
