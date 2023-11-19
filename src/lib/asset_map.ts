import { dirname, join } from "std/path/mod.ts";

import { Config } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { Asset } from "../utils/asset.ts";

export class AssetMap {
  assets: Map<string, Asset>;
  #config: Config;
  #renderer: Renderer;

  constructor(config: Config, renderer: Renderer) {
    this.assets = new Map();
    this.#config = config;
    this.#renderer = renderer;
  }

  track(content: RenderableDocument | undefined) {
    if (!content || !content.assets) {
      return;
    }

    content.assets.js.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.js!}/`)) {
        return;
      }
      const record: Asset = this.assets.get(v) ??
        new Asset({ assetType: "js", usedBy: [] });
      record.usedBy.push(content);
      this.assets.set(v, record);
    });

    content.assets.css.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.css!}/`)) {
        return;
      }
      const record: Asset = this.assets.get(v) ??
        new Asset({ assetType: "css", usedBy: [] });
      record.usedBy.push(content);
      this.assets.set(v, record);
    });
  }

  render(destPath: string, write = true) {
    return Promise.all(
      [...this.assets.entries()].map(async ([route, record]) => {
        const output = await this.#renderer.render(route, {
          usedBy: record.usedBy,
        });
        if (output.errorStatus) {
          console.error(`${output.errorMessage} - ${output.errorStatus}`);
          return;
        }

        const { content } = output;
        record.content = content;

        // update all used by files with new ref

        // write file
        const path = join(
          destPath,
          route,
        );
        await Deno.mkdir(dirname(path), { recursive: true });
        await Deno.writeTextFile(
          path,
          record.content!.toString(),
        );
      }),
    );
  }
}
