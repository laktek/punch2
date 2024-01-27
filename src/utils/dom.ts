import { DOMParser, Element, HTMLDocument } from "deno_dom";

import { AssetType } from "./asset.ts";

interface SrcsetItem {
  url: string;
  size: string;
}

function parseSrcset(srcset: string): SrcsetItem[] {
  const srcs = srcset.split(",");
  return srcs.map((src) => {
    const [url, size] = src.trim().split(" ");
    return { url, size };
  });
}

function stringifySrcset(srcset: SrcsetItem[]): string {
  return srcset.map(({ url, size }) => `${url} ${size}`).join(", ");
}

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

  // TODO: Support images, picture, and assets loaded via link preload (audio, video, fonts)
  get assets(): Record<AssetType, string[]> {
    const assets: Record<AssetType, string[]> = {
      js: [],
      css: [],
      image: [],
      audio: [],
      video: [],
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

    // image
    // TODO: support <picture>
    const images = this.document.querySelectorAll(
      "img",
    );
    images.forEach((i) => {
      const src = (i as Element).getAttribute("src");
      if (src) {
        assets.image.push(src);
      }
      const srcset = (i as Element).getAttribute("srcset");
      if (srcset) {
        parseSrcset(srcset).forEach(
          ({ url, size }: { url: string; size: string }) => {
            assets.image.push(url);
          },
        );
      }
    });

    const audios = this.document.querySelectorAll(
      "audio",
    );
    audios.forEach((i) => {
      const src = (i as Element).getAttribute("src");
      if (src) {
        assets.audio.push(src);
      }
      const srcElements = (i as Element).querySelectorAll("source");
      srcElements.forEach((se) => {
        const src = (se as Element).getAttribute("src");
        if (src) {
          assets.audio.push(src);
        }
      });
    });

    const videos = this.document.querySelectorAll(
      "video",
    );
    videos.forEach((i) => {
      const src = (i as Element).getAttribute("src");
      if (src) {
        assets.video.push(src);
      }
      const srcElements = (i as Element).querySelectorAll("source");
      srcElements.forEach((se) => {
        const src = (se as Element).getAttribute("src");
        if (src) {
          assets.video.push(src);
        }
      });
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

  #updateImagePaths(oldPath: string, newPath: string) {
    if (!this.document) {
      return;
    }
    const srcMatches = this.document.querySelectorAll(`img[src="${oldPath}"]`);
    srcMatches.forEach((match) =>
      (match as Element).setAttribute("src", newPath)
    );

    const srcsetMatches = this.document.querySelectorAll(
      `img[srcset*="${oldPath}"]`,
    );
    srcsetMatches.forEach((match) => {
      const srcsetVal = (match as Element).getAttribute("srcset");
      if (srcsetVal) {
        const srcSet = parseSrcset(srcsetVal);
        const updatedSrcset = srcSet.map(({ url, size }): SrcsetItem => {
          if (url === oldPath) {
            return { url: newPath, size };
          }
          return { url, size };
        });
        (match as Element).setAttribute(
          "srcset",
          stringifySrcset(updatedSrcset),
        );
      }
    });
  }

  #updateAudioPaths(oldPath: string, newPath: string) {
    if (!this.document) {
      return;
    }
    const srcMatches = this.document.querySelectorAll(
      `audio[src="${oldPath}"]`,
    );
    srcMatches.forEach((match) =>
      (match as Element).setAttribute("src", newPath)
    );

    const sourceTagMatches = this.document.querySelectorAll(
      `audio > source[src="${oldPath}"]`,
    );
    sourceTagMatches.forEach((match) => {
      const srcAttr = (match as Element).getAttribute("src");
      if (srcAttr) {
        (match as Element).setAttribute(
          "src",
          newPath,
        );
      }
    });
  }

  #updateVideoPaths(oldPath: string, newPath: string) {
    if (!this.document) {
      return;
    }
    const srcMatches = this.document.querySelectorAll(
      `video[src="${oldPath}"]`,
    );
    srcMatches.forEach((match) =>
      (match as Element).setAttribute("src", newPath)
    );

    const sourceTagMatches = this.document.querySelectorAll(
      `video > source[src="${oldPath}"]`,
    );
    sourceTagMatches.forEach((match) => {
      const srcAttr = (match as Element).getAttribute("src");
      if (srcAttr) {
        (match as Element).setAttribute(
          "src",
          newPath,
        );
      }
    });
  }

  updateAssetPaths(assetType: AssetType, oldPath: string, newPath: string) {
    if (assetType === "js") {
      this.#updateScriptPaths(oldPath, newPath);
    } else if (assetType === "css") {
      this.#updateStylesheetPaths(oldPath, newPath);
    } else if (assetType === "image") {
      this.#updateImagePaths(oldPath, newPath);
    } else if (assetType === "audio") {
      this.#updateAudioPaths(oldPath, newPath);
    } else if (assetType === "video") {
      this.#updateVideoPaths(oldPath, newPath);
    }
  }
}
