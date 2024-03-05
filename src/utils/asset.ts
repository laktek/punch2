import { RenderableDocument } from "./dom.ts";
import { ResourceType } from "./routes.ts";

export class Asset {
  resourceType: ResourceType;
  usedBy: RenderableDocument[];
  hash?: string;

  constructor(
    opts: {
      resourceType: ResourceType;
      usedBy: RenderableDocument[];
    },
  ) {
    this.resourceType = opts.resourceType;
    this.usedBy = opts.usedBy;
  }
}
