import { DOMParser, Element, HTMLDocument } from "deno_dom";

import { AssetType } from "../lib/assets.ts";

export class RenderableDocument {
  document: HTMLDocument | null;

  constructor(content: string) {
    this.document = new DOMParser().parseFromString(content, "text/html");
  }

  toString(): string {
    if (!this.document || !this.document.documentElement) {
      return "";
    }

    const documentElement = this.document.documentElement.outerHTML;
    return `<!doctype html>${documentElement}`;
  }

  get assets(): Record<AssetType, string[]> {
    const assets: Record<AssetType, string[]> = {
      js: [],
      css: [],
    };

    if (!this.document) {
      return assets;
    }

    const scripts = Array.from(this.document.getElementsByTagName("script"));
    scripts.forEach((s: Element) => {
      const src = s.getAttribute("src");

      if (src) {
        assets.js.push(src);
      }
    });

    const stylesheets = Array.from(this.document.getElementsByTagName("link"));
    stylesheets.forEach((s: Element) => {
      const rel = s.getAttribute("rel");
      if (rel !== "stylesheet") {
        return;
      }

      const href = s.getAttribute("href");
      if (href) {
        assets.css.push(href);
      }
    });

    return assets;
  }
}
