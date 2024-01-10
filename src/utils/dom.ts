import { DOMParser, Element, HTMLDocument } from "deno_dom";

import { AssetType } from "./asset.ts";

export class RenderableDocument {
  document: HTMLDocument | null;

  constructor(content: string) {
    if (!content) {
      this.document = null;
    } else {
      this.document = new DOMParser().parseFromString(content, "text/html");
    }
  }

  toString(): string {
    if (!this.document || !this.document.documentElement) {
      return "";
    }

    const documentElement = this.document.documentElement.outerHTML;
    return `<!doctype html>${documentElement}`;
  }

  // TODO: Support images and assets loaded via link preload (audio, video, fonts)
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

    const stylesheets = this.document.querySelectorAll(
      "link[rel='stylesheet']",
    );
    stylesheets.forEach((s) => {
      const href = (s as Element).getAttribute("href");
      if (href) {
        assets.css.push(href);
      }
    });

    return assets;
  }

  #updateScriptPaths(oldPath: string, newPath: string) {
    if (!this.document) {
      return;
    }
    const matches = this.document.querySelectorAll(`script[src="${oldPath}"]`);
    matches.forEach((match) => (match as Element).setAttribute("src", newPath));
  }

  #updateStylesheetPaths(oldPath: string, newPath: string) {
    if (!this.document) {
      return;
    }
    const matches = this.document.querySelectorAll(
      `link[rel='stylesheet'][href="${oldPath}"]`,
    );
    matches.forEach((match) =>
      (match as Element).setAttribute("href", newPath)
    );
  }

  updateAssetPaths(assetType: AssetType, oldPath: string, newPath: string) {
    if (assetType === "js") {
      this.#updateScriptPaths(oldPath, newPath);
    } else if (assetType === "css") {
      this.#updateStylesheetPaths(oldPath, newPath);
    }
  }
}
