import { join } from "std/path/mod.ts";

import { Config } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { RenderableDocument } from "../utils/dom.ts";

export type AssetType = "js" | "css";

export interface AssetRecord {
  assetType: AssetType;
  content?: string | RenderableDocument | undefined;
  hash?: string;
  usedBy: RenderableDocument[];
}

function generateHash(content: string): string {
  return content;
}

export class AssetMap {
  assets: Map<string, AssetRecord>;
  #config: Config;
  #renderer: Renderer;

  constructor(config: Config, renderer: Renderer) {
    this.assets = new Map();
    this.#config = config;
    this.#renderer = renderer;
  }

  track(route: string, content: RenderableDocument | undefined) {
    if (!content || !content.assets) {
      return;
    }

    content.assets.js.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.js!}/`)) {
        return;
      }
      const record: AssetRecord = this.assets.get(v) ??
        { assetType: "js", usedBy: [] };
      record.usedBy.push(content);
      this.assets.set(v, record);
    });

    content.assets.css.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.css!}/`)) {
        return;
      }
      const record: AssetRecord = this.assets.get(v) ??
        { assetType: "css", usedBy: [] };
      record.usedBy.push(content);
      this.assets.set(v, record);
    });
  }

  async render() {
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
        const hash = generateHash(content!.toString());
        const modifiedRecord = { ...record, content, hash };
        this.assets.set(route, modifiedRecord);
      }),
    );
  }
}
