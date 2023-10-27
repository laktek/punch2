import { assert, assertEquals } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";

import { routesFromPages } from "./routes.ts";

Deno.test("routesFromPages", async (t) => {
  const pagesDir = await Deno.makeTempDir();

  await t.step(
    "returns an empty array if pages directory does not exist",
    async () => {
      const routes = await routesFromPages("/var/punch/no-exist", [".html"]);
      assertEquals(
        routes,
        [],
        "expected an empty array",
      );
    },
  );

  await t.step(
    "returns only the paths of pages with given extensions",
    async () => {
      const paths = [
        "index.html",
        "foo/index.html",
        "foo/bar/baz.html",
        "foo/bar/baz.js",
      ];
      await Deno.mkdir(join(pagesDir, "/foo/bar/baz"), { recursive: true });

      paths.forEach(async (p) =>
        await Deno.writeTextFile(join(pagesDir, p), "test")
      );

      const routes = await routesFromPages(pagesDir, [".html"]);
      assertEquals(
        routes,
        ["index.html", "foo/index.html", "foo/bar/baz.html"],
        "expected array of routes",
      );
    },
  );
});
