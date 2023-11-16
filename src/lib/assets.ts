import { join } from "std/path/mod.ts";

import { Config } from "../config/config.ts";

export type AssetType = "js" | "css";

export interface AssetRecord {
  assetType: AssetType;
  contentHash?: string;
  content?: string;
  used_by: string[];
}

export class AssetMap {
  assets: Map<string, AssetRecord>;
  #config: Config;

  constructor(config: Config) {
    this.assets = new Map();
    this.#config = config;
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
}
