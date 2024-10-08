import { assert, assertArrayIncludes, assertEquals } from "@std/assert";

import { AssetMap } from "./asset_map.ts";
import { getConfig } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { Contents } from "./contents.ts";
import { Resources } from "./resources.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { ResourceType } from "../utils/routes.ts";

Deno.test("AssetMap.track", async (t) => {
  const config = await getConfig();
  const contents = new Contents();
  const resources = new Resources();

  const context = {
    srcPath: "src/path",
    config,
    contents,
    resources,
    devMode: true,
  };
  const renderer = await Renderer.init(context);

  await t.step("no content provided", () => {
    const assetMap = new AssetMap(config, renderer);

    assetMap.track(undefined);

    assert([...assetMap.assets.keys()].length === 0);
  });

  await t.step("content has no assets", () => {
    const assetMap = new AssetMap(config, renderer);

    const content = new RenderableDocument("");
    assetMap.track(content);

    assert([...assetMap.assets.keys()].length === 0);
  });

  await t.step("tracks only local assets", () => {
    const assetMap = new AssetMap(config, renderer);

    const content = new RenderableDocument(
      `<html><head><link rel='stylesheet' href='/css/main.css'/><link rel='stylesheet' href='https://cdn.com/utils.css'/><script src='/js/main.ts'/><script src='https://cnd.com/utils.ts'/></head>`,
    );
    assetMap.track(content);

    assertEquals([...assetMap.assets.keys()], ["/js/main.ts", "/css/main.css"]);
    assertEquals(
      assetMap.assets.get("/css/main.css")!.resourceType,
      ResourceType.CSS,
    );
    assertEquals(
      assetMap.assets.get("/js/main.ts")!.resourceType,
      ResourceType.JS,
    );

    // TODO: Add tests for image, audio, video
  });

  await t.step("should not add duplicate entries", () => {
    const assetMap = new AssetMap(config, renderer);

    assetMap.assets.set("/js/main.ts", {
      resourceType: ResourceType.JS,
      usedBy: [new RenderableDocument("")],
    });

    assetMap.assets.set("/css/main.css", {
      resourceType: ResourceType.CSS,
      usedBy: [new RenderableDocument("")],
    });

    const content = new RenderableDocument(
      `<html><head><link rel='stylesheet' href='/css/main.css'/><script src='/js/main.ts'/></head>`,
    );
    assetMap.track(content);

    assert([...assetMap.assets.keys()].length === 2);
    assertArrayIncludes(assetMap.assets.get("/css/main.css")!.usedBy, [
      content,
    ]);
    assertArrayIncludes(assetMap.assets.get("/js/main.ts")!.usedBy, [content]);
  });
});
