import { join } from "std/path/mod.ts";

import { Config } from "../config/config.ts";
import { Renderer } from "./render.ts";
import { RenderableDocument } from "../utils/dom.ts";

export type AssetType = "js" | "css";

export interface AssetRecord {
  assetType: AssetType;
  content?: string | RenderableDocument | undefined;
  hash?: string;
  used_by: string[];
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

  track(route: string, assets?: Record<AssetType, string[]>) {
    if (!assets) {
      return;
    }

    assets.js.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.js!}/`)) {
        return;
      }
      const record: AssetRecord = this.assets.get(v) ??
        { assetType: "js", used_by: [] };
      record.used_by.push(route);
      this.assets.set(v, record);
    });

    assets.css.forEach((v) => {
      // only track assets in js/ directory
      if (!v.startsWith(`/${this.#config.dirs!.css!}/`)) {
        return;
      }
      const record: AssetRecord = this.assets.get(v) ??
        { assetType: "js", used_by: [] };
      record.used_by.push(route);
      this.assets.set(v, record);
    });
  }

  async render() {
    this.assets.forEach(async (record, route) => {
      const output = await this.#renderer.render(route);
      const { content } = output;
      const hash = generateHash(content!.toString());
      const modifiedRecord = { ...record, content, hash };
      this.assets.set(route, modifiedRecord);
    });
  }
}
