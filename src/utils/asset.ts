import { RenderableDocument } from "../utils/dom.ts";

export type AssetType = "js" | "css" | "image" | "audio" | "video";

export class Asset {
  assetType: AssetType;
  usedBy: RenderableDocument[];
  hash?: string;

  constructor(
    opts: {
      assetType: AssetType;
      usedBy: RenderableDocument[];
    },
  ) {
    this.assetType = opts.assetType;
    this.usedBy = opts.usedBy;
  }
}
