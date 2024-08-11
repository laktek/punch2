import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { Database } from "sqlite";

import {
  findResource,
  getRouteParams,
  prepareExplicitRoutes,
  ResourceType,
  routesFromPages,
} from "./routes.ts";
import { Contents } from "../lib/contents.ts";

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
      await findResource(srcPath, config, "/css/styles.css"),
      {
        path: join(srcPath, "css", "styles.css"),
        resourceType: ResourceType.CSS,
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/css/not-exist.css"),
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
    await Deno.writeTextFile(
      join(srcPath, "js", "data.json"),
      "{}",
    );

    const config = {
      dirs: {
        js: "js",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/js/module.js"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.js"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/js/module.ts"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.ts"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/js/module.jsx"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.jsx"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/js/module.tsx"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "module.tsx"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/js/data.json"),
      {
        resourceType: ResourceType.JS,
        path: join(srcPath, "js", "data.json"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/js/not-exist.js"),
      null,
    );
  });

  await t.step("find image resources", async () => {
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
      await findResource(srcPath, config, "/images/sample.svg"),
      {
        resourceType: ResourceType.IMAGE,
        path: join(srcPath, "images", "sample.svg"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/images/not-exist.svg"),
      null,
    );
    assertEquals(
      await findResource(srcPath, config, "/not-images/sample.svg"),
      null,
    );
  });

  await t.step("find feeds (RSS / JSON)", async () => {
    await Deno.mkdir(join(srcPath, "feeds"));
    await Deno.writeTextFile(
      join(srcPath, "feeds", "index.xml"),
      "<rss></rss>",
    );

    const config = {
      dirs: {
        feeds: "feeds",
      },
    };

    assertEquals(
      await findResource(srcPath, config, "/feeds/index.xml"),
      {
        resourceType: ResourceType.XML,
        path: join(srcPath, "feeds", "index.xml"),
      },
    );
    assertEquals(
      await findResource(srcPath, config, "/feeds/not-exist.xml"),
      null,
    );
    assertEquals(
      await findResource(srcPath, config, "/not-feeds/index.xml"),
      null,
    );
  });

  await t.step("find page templates with extension", async () => {
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

  await t.step("match extension less routes to page templates", async () => {
    const pagesPath = join(srcPath, "pages");
    await Deno.mkdir(pagesPath);
    await Deno.writeTextFile(
      join(pagesPath, "sample.html"),
      "<html></html>",
    );
    await Deno.mkdir(join(pagesPath, "sample-dir"), { recursive: true });

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
      await findResource(srcPath, config, "/sample/"),
      { resourceType: ResourceType.HTML, path: join(pagesPath, "sample.html") },
    );
    assertEquals(
      await findResource(srcPath, config, "/not-exist"),
      null,
    );

    await Deno.remove(pagesPath, { recursive: true });
  });

  await t.step(
    "match extension less routes to directory index pages",
    async () => {
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
    },
  );

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
        getRouteParams("/path/to/foo", "path/_slug_.html"),
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

Deno.test("prepareExplicitRoutes", async (t) => {
  const db = new Database(":memory:");
  const contents = new Contents(db);
  contents.insert("posts", [{ "year": 2023, "slug": "/hello" }, {
    "year": 2024,
    "slug": "/world",
    "id": "1234",
  }]);

  await t.step(
    "expands content tokens",
    () => {
      assertEquals(
        prepareExplicitRoutes(["[posts.slug]"], contents),
        ["/hello", "/world"],
        "should expand content token",
      );

      assertEquals(
        prepareExplicitRoutes(["/posts/[posts.slug]"], contents),
        ["/posts/hello", "/posts/world"],
        "should expand content tokens with prefix",
      );

      assertEquals(
        prepareExplicitRoutes(["/[posts.slug]/post"], contents),
        ["/hello/post", "/world/post"],
        "should expand content tokens with suffix",
      );

      assertEquals(
        prepareExplicitRoutes(["/year/[posts.year]/posts"], contents),
        ["/year/2023/posts", "/year/2024/posts"],
        "should expand content tokens with prefix and suffix",
      );

      assertEquals(
        prepareExplicitRoutes(["/posts/[posts.year]/[posts.slug]"], contents),
        ["/posts/2023/hello", "/posts/2024/world"],
        "should expand all content tokens",
      );

      assertEquals(
        prepareExplicitRoutes(["/posts/[posts.path]"], contents),
        [],
        "should return empty if content token does not exist",
      );

      assertEquals(
        prepareExplicitRoutes(["/posts/[posts.id]"], contents),
        ["/posts/1234"],
        "should not return null or undefined tokens",
      );
    },
  );

  await t.step(
    "removes trailing slash and adds a leading slash",
    () => {
      assertEquals(
        prepareExplicitRoutes(
          ["/path/to/foo", "path/to/foo", "path/to/foo/"],
          contents,
        ),
        ["/path/to/foo", "/path/to/foo", "/path/to/foo"],
        "should remove the trailing slash and add a leading slash",
      );
    },
  );

  db.close();
});
