import { extname, join } from "@std/path";

import { Config } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { ResourceType } from "../utils/routes.ts";
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

    content.assets[ResourceType.JS].forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.js!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ resourceType: ResourceType.JS, usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets[ResourceType.CSS].forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.css!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ resourceType: ResourceType.CSS, usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets[ResourceType.IMAGE].forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.images!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ resourceType: ResourceType.IMAGE, usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets[ResourceType.AUDIO].forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.audio!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ resourceType: ResourceType.AUDIO, usedBy: [] });
      asset.usedBy.push(content);
      this.assets.set(v, asset);
    });

    content.assets[ResourceType.VIDEO].forEach((v) => {
      if (!v.startsWith(`/${this.#config.dirs!.video!}/`)) {
        return;
      }
      const asset: Asset = this.assets.get(v) ??
        new Asset({ resourceType: ResourceType.VIDEO, usedBy: [] });
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

        const { content, metadata } = output;

        const hash = await hashContent(content! as Uint8Array);
        let assetPath = routeWithContentHash(route, hash);

        if (asset.resourceType === ResourceType.IMAGE && metadata?.ext) {
          const ext = extname(assetPath);
          assetPath = assetPath.replace(ext, metadata?.ext);
        }

        asset.hash = hash;

        // update all used by files with new ref
        asset.usedBy.forEach((doc) =>
          doc.updateAssetPaths(asset.resourceType, route, assetPath, metadata)
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
