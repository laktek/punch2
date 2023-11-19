import { RenderableDocument } from "../utils/dom.ts";

export type AssetType = "js" | "css";

export class Asset {
  assetType: AssetType;
  content?: string | RenderableDocument;
  usedBy: RenderableDocument[];

  constructor(
    opts: {
      assetType: AssetType;
      content?: string | RenderableDocument;
      usedBy: RenderableDocument[];
    },
  ) {
    this.assetType = opts.assetType;
    this.content = opts.content;
    this.usedBy = opts.usedBy;
  }
}
