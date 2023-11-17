import { assert, assertEquals, assertRejects } from "std/testing/asserts.ts";

import { getConfig } from "../config/config.ts";
import { AssetMap } from "./assets.ts";
import { Renderer } from "./render.ts";
import { Contents } from "./contents.ts";

Deno.test("AssetMap.track", async (t) => {
  const config = await getConfig();
  const contents = new Contents();

  const context = {
    srcPath: "src/path",
    config,
    contents,
  };
  const renderer = await Renderer.init(context);

  await t.step("no assets provided", async () => {
    const assetMap = new AssetMap(config, renderer);

    assetMap.track("/index.html");

    assert([...assetMap.assets.keys()].length === 0);
  });

  await t.step("tracks only local JS and CSS assets", async () => {
    const assetMap = new AssetMap(config, renderer);

    assetMap.track("/index.html", {
      "js": [
        "https://cdn.com/utils.js",
        "/js/main.ts",
      ],
      "css": [
        "https://cdn.com/utils.css",
        "/css/main.css",
      ],
    });

    assertEquals([...assetMap.assets.keys()], ["/js/main.ts", "/css/main.css"]);
  });

  await t.step("should not add duplicate entries", async () => {
    const assetMap = new AssetMap(config, renderer);

    assetMap.assets.set("/js/main.ts", {
      assetType: "js",
      used_by: ["/index.html"],
    });

    assetMap.assets.set("/css/main.css", {
      assetType: "css",
      used_by: ["/index.html"],
    });

    assetMap.track("/foo/bar.html", {
      "js": [
        "https://cdn.com/utils.js",
        "/js/main.ts",
      ],
      "css": [
        "https://cdn.com/utils.css",
        "/css/main.css",
      ],
    });

    assert([...assetMap.assets.keys()].length === 2);
    assertEquals(assetMap.assets.get("/js/main.ts")!.used_by, [
      "/index.html",
      "/foo/bar.html",
    ]);
  });
});
