import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

export class RenderableDocument {
  document: HTMLDocument;

  constructor(content: string) {
    this.document = new DOMParser().parseFromString(content, "text/html");
  }

  toString() {
    const documentElement = this.document.documentElement.outerHTML;
    return `<!doctype html>${documentElement}`;
  }
}
