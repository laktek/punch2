import { DOMParser, Element, HTMLDocument } from "deno_dom";

export enum AssetType {
  JS = "JS",
  CSS = "CSS",
}

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

  get assets(): { [key in AssetType]: string[] } {
    const assets: { [key in AssetType]: string[] } = {
      [AssetType.JS]: [],
      [AssetType.CSS]: [],
    };

    if (!this.document) {
      return assets;
    }

    const scripts = Array.from(this.document.getElementsByTagName("script"));
    scripts.forEach((s: Element) => {
      const src = s.getAttribute("src");

      if (src) {
        assets[AssetType.JS].push(src);
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
        assets[AssetType.CSS].push(href);
      }
    });

    return assets;
  }
}
