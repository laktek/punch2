import { assertEquals } from "std/testing/asserts.ts";
import { join } from "std/path/mod.ts";

import {
  findResource,
  getRouteParams,
  normalizeRoutes,
  ResourceType,
  routesFromPages,
} from "./routes.ts";

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

  await t.step(
    "skips dotfiles",
    async () => {
      const paths = [
        "index.html",
        ".dotfile",
        "foo/index.html",
        "foo/.dotfile",
        "foo/bar/baz.html",
        "foo/bar/.dotfile",
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

  await t.step(
    "skips dynamic page templates",
    async () => {
      const paths = [
        "index.html",
        "page_1_.html",
        "_slug_.html",
        "foo/index.html",
        "foo/page_1_.html",
        "foo/_id_.html",
        "foo/bar/baz.html",
        "foo/bar/_id_.html",
      ];
      await Deno.mkdir(join(pagesDir, "/foo/bar/baz"), { recursive: true });

      paths.forEach(async (p) =>
        await Deno.writeTextFile(join(pagesDir, p), "test")
      );

      const routes = await routesFromPages(pagesDir, [".html"]);
      assertEquals(
        routes,
        [
          "index.html",
          "page_1_.html",
          "foo/index.html",
          "foo/page_1_.html",
          "foo/bar/baz.html",
        ],
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
    await Deno.writeTextFile(
      join(srcPath, "js", "module.ts"),
      "export default foo = 'foo'",
    );
    await Deno.writeTextFile(
      join(srcPath, "js", "module.jsx"),
      "<div>{test}</div>",
    );
    await Deno.writeTextFile(
      join(srcPath, "js", "module.tsx"),
      "<div>{test}</div>",
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
      await findResource(srcPath, config, "/module.ts"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.ts"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/module.jsx"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.jsx"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/module.tsx"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.tsx"),
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

  await t.step("find direct page templates", async () => {
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

  await t.step("match directory routes to index pages", async () => {
    const pagesPath = join(srcPath, "pages");
    await Deno.mkdir(join(pagesPath, "sample-dir"), { recursive: true });
    await Deno.writeTextFile(
      join(join(pagesPath, "sample-dir"), "index.html"),
      "<html></html>",
    );

    const config = {
      dirs: {
        pages: "pages",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/sample-dir"),
      {
        resourceType: ResourceType.HTML,
        path: join(pagesPath, "sample-dir", "index.html"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist"),
      null,
    );
  });

  await t.step("match routes to dynamic pages", async () => {
    const pagesPath = join(srcPath, "pages");
    await Deno.writeTextFile(
      join(pagesPath, "_slug_.html"),
      "<html></html>",
    );
    await Deno.mkdir(join(pagesPath, "blogs"), { recursive: true });
    await Deno.writeTextFile(
      join(pagesPath, "blogs", "_title_.html"),
      "<html></html>",
    );
    const config = {
      dirs: {
        pages: "pages",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/foo"),
      { resourceType: ResourceType.HTML, path: join(pagesPath, "_slug_.html") },
    );
    assertEquals(
      await findResource(srcPath, config, "/blogs/test-post"),
      {
        resourceType: ResourceType.HTML,
        path: join(pagesPath, "blogs", "_title_.html"),
      },
    );
  });

  await t.step(
    "traverse parent paths to find the closest dynamic page template",
    async () => {
      const pagesPath = join(srcPath, "pages");
      await Deno.mkdir(join(pagesPath, "blogs"), { recursive: true });
      await Deno.writeTextFile(
        join(pagesPath, "blogs", "_title_.html"),
        "<html></html>",
      );
      const config = {
        dirs: {
          pages: "pages",
        },
      };

      assertEquals(
        await findResource(srcPath, config, "/blogs/2023/11/03/test-post"),
        {
          resourceType: ResourceType.HTML,
          path: join(pagesPath, "blogs", "_title_.html"),
        },
      );
    },
  );

  await Deno.remove(srcPath, { recursive: true });
});

Deno.test("getRouteParams", async (t) => {
  await t.step(
    "route without a dynamic page template",
    () => {
      assertEquals(
        getRouteParams("/path/to/foo", "/path/to/foo.html"),
        { path: "/path/to/foo", segments: ["path", "to", "foo"] },
      );
    },
  );

  await t.step(
    "route with a dynamic page template",
    () => {
      assertEquals(
        getRouteParams("/path/to/foo", "/path/_slug_.html"),
        {
          path: "/path/to/foo",
          segments: ["path", "to", "foo"],
          slug: "to/foo",
        },
      );

      assertEquals(
        getRouteParams("/path/to/foo", "/path/to/_id_.html"),
        {
          path: "/path/to/foo",
          segments: ["path", "to", "foo"],
          id: "foo",
        },
      );
    },
  );
});

Deno.test("normalizeRoutes", async (t) => {
  await t.step(
    "removes leading and trailing slashes",
    () => {
      assertEquals(
        normalizeRoutes(["/path/to/foo", "path/to/foo", "path/to/foo/"]),
        ["path/to/foo", "path/to/foo", "path/to/foo"],
        "should remove the leading & trailing slashes",
      );
    },
  );
});
