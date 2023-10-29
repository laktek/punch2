import { assert, assertEquals } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";

import { findResource, ResourceType, routesFromPages } from "./routes.ts";

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

  await Deno.remove(pagesDir, { recursive: true });
});

Deno.test("findResource", async (t) => {
  const srcPath = await Deno.makeTempDir();

  await t.step("find CSS resources", async () => {
    await Deno.mkdir(join(srcPath, "css"));
    await Deno.writeTextFile(
      join(srcPath, "css", "styles.css"),
      "div { display: none; }",
    );

    const config = {
      dirs: {
        css: "css",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/styles.css"),
      {
        path: join(srcPath, "css", "styles.css"),
        resourceType: ResourceType.CSS,
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist.css"),
      null,
    );
  });

  await t.step("find JS resources", async () => {
    await Deno.mkdir(join(srcPath, "js"));
    await Deno.writeTextFile(
      join(srcPath, "js", "module.js"),
      "export default foo = 'foo'",
    );

    const config = {
      dirs: {
        js: "js",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/module.js"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.js"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist.js"),
      null,
    );
  });

  await t.step("find SVG resources", async () => {
    await Deno.mkdir(join(srcPath, "images"));
    await Deno.writeTextFile(
      join(srcPath, "images", "sample.svg"),
      "<svg></svg>",
    );

    const config = {
      dirs: {
        images: "images",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/sample.svg"),
      {
        resourceType: ResourceType.SVG,
        path: join(srcPath, "images", "sample.svg"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist.svg"),
      null,
    );
  });

  await t.step("find HTML pages", async () => {
    const pagesPath = join(srcPath, "pages");
    await Deno.mkdir(pagesPath);
    await Deno.writeTextFile(
      join(pagesPath, "sample.html"),
      "<html></html>",
    );

    const config = {
      dirs: {
        pages: "pages",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/sample.html"),
      { resourceType: ResourceType.HTML, path: join(pagesPath, "sample.html") },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist.html"),
      null,
    );

    await Deno.remove(pagesPath, { recursive: true });
  });

  const pagesPath = join(srcPath, "pages");
  await Deno.mkdir(join(pagesPath, "sample"), { recursive: true });
  await Deno.writeTextFile(
    join(join(pagesPath, "sample"), "index.html"),
    "<html></html>",
  );
  await Deno.writeTextFile(
    join(pagesPath, "sample.html"),
    "<html></html>",
  );

  await t.step("match directory routes to index pages", async () => {
    const config = {
      dirs: {
        pages: "pages",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/sample"),
      { resourceType: ResourceType.HTML, path: join(pagesPath, "sample.html") },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist"),
      null,
    );
  });

  await t.step("match no extension routes to pages", async () => {
    const config = {
      dirs: {
        pages: "pages",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/sample"),
      { resourceType: ResourceType.HTML, path: join(pagesPath, "sample.html") },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist"),
      null,
    );
  });

  await Deno.remove(srcPath, { recursive: true });
});
