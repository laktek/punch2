import { DOMParser, Element, HTMLDocument } from "deno_dom";

import { ResourceType } from "./routes.ts";

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
  get assets(): Record<
    Exclude<
      ResourceType,
      ResourceType.HTML | ResourceType.XML | ResourceType.TXT
    >,
    string[]
  > {
    const assets: Record<
      Exclude<
        ResourceType,
        ResourceType.HTML | ResourceType.XML | ResourceType.TXT
      >,
      string[]
    > = {
      [ResourceType.JS]: [],
      [ResourceType.CSS]: [],
      [ResourceType.IMAGE]: [],
      [ResourceType.AUDIO]: [],
      [ResourceType.VIDEO]: [],
    };

    if (!this.document) {
      return assets;
    }

    const scripts = Array.from(this.document.getElementsByTagName("script"));
    scripts.forEach((s: Element) => {
      const src = s.getAttribute("src");

      if (src) {
        assets[ResourceType.JS].push(src);
      }
    });

    const stylesheets = this.document.querySelectorAll(
      "link[rel='stylesheet']",
    );
    stylesheets.forEach((s) => {
      const href = (s as Element).getAttribute("href");
      if (href) {
        assets[ResourceType.CSS].push(href);
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
        assets[ResourceType.IMAGE].push(src);
      }
      const srcset = (i as Element).getAttribute("srcset");
      if (srcset) {
        parseSrcset(srcset).forEach(
          ({ url }: { url: string; size: string }) => {
            assets[ResourceType.IMAGE].push(url);
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
        assets[ResourceType.AUDIO].push(src);
      }
      const srcElements = (i as Element).querySelectorAll("source");
      srcElements.forEach((se) => {
        const src = (se as Element).getAttribute("src");
        if (src) {
          assets[ResourceType.AUDIO].push(src);
        }
      });
    });

    const videos = this.document.querySelectorAll(
      "video",
    );
    videos.forEach((i) => {
      const src = (i as Element).getAttribute("src");
      if (src) {
        assets[ResourceType.VIDEO].push(src);
      }
      const srcElements = (i as Element).querySelectorAll("source");
      srcElements.forEach((se) => {
        const src = (se as Element).getAttribute("src");
        if (src) {
          assets[ResourceType.VIDEO].push(src);
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

  #updateImagePaths(oldPath: string, newPath: string, metadata?: any) {
    if (!this.document) {
      return;
    }
    const srcMatches = this.document.querySelectorAll(`img[src="${oldPath}"]`);
    srcMatches.forEach((match) => {
      (match as Element).setAttribute("src", newPath);
      (match as Element)
        .setAttribute("width", metadata?.width);
      (match as Element).setAttribute(
        "height",
        metadata?.height,
      );
    });

    // TODO: width/height for srcset
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

    // Update OG image meta tags
    const ogImageMatches = this.document.querySelectorAll(
      `meta[property="og:image"][content="${oldPath}"], meta[property="og:image:url"][content="${oldPath}"], meta[property="og:image:secure_url"][content="${oldPath}"]`,
    );
    ogImageMatches.forEach((match) => {
      (match as Element).setAttribute("content", newPath);
    });

    // Update Twitter card image meta tags
    const twitterImageMatches = this.document.querySelectorAll(
      `meta[name="twitter:image"][content="${oldPath}"]`,
    );
    twitterImageMatches.forEach((match) => {
      (match as Element).setAttribute("content", newPath);
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

  updateAssetPaths(
    resourceType: ResourceType,
    oldPath: string,
    newPath: string,
    metadata?: any,
  ) {
    if (resourceType === ResourceType.JS) {
      this.#updateScriptPaths(oldPath, newPath);
    } else if (resourceType === ResourceType.CSS) {
      this.#updateStylesheetPaths(oldPath, newPath);
    } else if (resourceType === ResourceType.IMAGE) {
      this.#updateImagePaths(oldPath, newPath, metadata);
    } else if (resourceType === ResourceType.AUDIO) {
      this.#updateAudioPaths(oldPath, newPath);
    } else if (resourceType === ResourceType.VIDEO) {
      this.#updateVideoPaths(oldPath, newPath);
    }
  }
}
