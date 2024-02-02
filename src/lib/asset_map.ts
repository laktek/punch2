import { join } from "std/path/mod.ts";

import { Config } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { Asset } from "../utils/asset.ts";
import { writeFile } from "../utils/fs.ts";
import { hashContent, routeWithContentHash } from "../utils/content_hash.ts";

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
      if (!v.startsWith(`/${this.#config.dirs!.js!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ assetType: "js", usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets.css.forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.css!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ assetType: "css", usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets.image.forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.images!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ assetType: "image", usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets.audio.forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.media!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ assetType: "audio", usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets.video.forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.media!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ assetType: "video", usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });
  }

  render(destPath: string, write = true) {
    return Promise.all(
      [...this.assets.entries()].map(async ([route, asset]) => {
        const output = await this.#renderer.render(route, {
          usedBy: asset.usedBy,
        });
        if (output.errorStatus) {
          console.error(
            `${route} - ${output.errorMessage} (${output.errorStatus})`,
          );
          return;
        }

        const { content } = output;

        const hash = await hashContent(content! as Uint8Array);
        const assetPath = routeWithContentHash(route, hash);

        // update all used by files with new ref
        asset.usedBy.forEach((doc) =>
          doc.updateAssetPaths(asset.assetType, route, assetPath)
        );

        if (write) {
          await writeFile(
            join(
              destPath,
              assetPath,
            ),
            content! as Uint8Array,
          );
        }
      }),
    );
  }
}
