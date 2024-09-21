import { basename, extname, join, relative } from "@std/path";
import { exists, walk } from "@std/fs";
import { escape, unescape } from "@std/html";
import { createContext, Script } from "node:vm";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, getRouteParams, ResourceType } from "../utils/routes.ts";
import { NotFoundError, renderHTML } from "../utils/renderers/html.ts";
import { getTailwindConfig, renderCSS } from "../utils/renderers/css.ts";
import { renderJS } from "../utils/renderers/js.ts";
import { renderImage } from "../utils/renderers/image.ts";
import { renderMedia } from "../utils/renderers/media.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { commonSkipPaths } from "../utils/paths.ts";

export interface Context {
  srcPath: string;
  config: Config;
  contents: Contents;
}

export interface Output {
  route: string;
  resourceType?: ResourceType;
  content?: RenderableDocument | Uint8Array;
  hash?: string;
  errorStatus?: number;
  errorMessage?: string;
}

export interface RenderOptions {
  usedBy?: RenderableDocument[];
}

function queryContents(contents: Contents, params: any) {
  const { from, offset, order_by, limit, count, ...where } = params;
  const results = contents.query(from, {
    limit,
    where: Object.entries(where).map(([k, v]) => [k, v]),
    offset,
    order_by,
    count,
  });
  return results;
}

export class Renderer {
  #htmlTemplateCache: Map<string, Promise<Script>>;
  #partialsCache: Map<string, Script>;
  context: Context;

  constructor(context: Context) {
    this.context = context;
    this.#htmlTemplateCache = new Map();
    this.#partialsCache = new Map();
  }

  static async init(context: Context) {
    const renderer = new Renderer(context);
    await renderer.#cachePartials();
    return renderer;
  }

  async refresh() {
    this.#htmlTemplateCache = new Map();
    await this.#cachePartials();
  }

  async #cachePartials() {
    const { srcPath, config } = this.context;

    const partialsPath = join(srcPath, config.dirs!.partials!);
    if (!(await exists(partialsPath))) {
      return;
    }

    // walk partials directory
    // TODO: add support for symlinks in partials directory
    for await (
      const entry of walk(partialsPath, { maxDepth: 1, skip: commonSkipPaths })
    ) {
      if (entry.isFile) {
        const tmpl = await Deno.readTextFile(entry.path);
        const script = new Script("`" + tmpl + "`");
        const ext = extname(entry.name);
        const name = basename(entry.name, ext);
        this.#partialsCache.set(name, script);
      }
    }
  }

  #getHTMLTemplate(path: string): Promise<Script> {
    const cached = this.#htmlTemplateCache.get(path);
    if (cached) {
      return cached;
    }
    const promise = (async () => {
      const tmpl = await Deno.readTextFile(path);
      return new Script("`" + tmpl + "`");
    })();
    this.#htmlTemplateCache.set(path, promise);
    return promise;
  }

  async render(route: string, opts?: RenderOptions): Promise<Output> {
    const { srcPath, config, contents } = this.context;

    const resource = await findResource(srcPath, config, route);
    if (!resource) {
      return {
        route: route,
        errorStatus: 404,
        errorMessage: "not found",
      };
    }

    const { path, resourceType } = resource;

    const partialsCache = this.#partialsCache;

    const builtins = {
      console,
      Date,
      Intl,
      JSON,
      atob,
      btoa,
      TextEncoder,
      TextDecoder,
      URL,
      URLPattern,
      URLSearchParams,
      Punch: {
        route: getRouteParams(
          route,
          relative(join(srcPath, config.dirs!.pages!), path),
        ),
        one: (params: any, callback: (i: unknown) => string) => {
          const results = queryContents(contents, {
            ...params,
            limit: 1,
          });
          return callback(results[0]);
        },
        all: (params: any, callback: (i: unknown) => string) => {
          return queryContents(contents, params).map((result) =>
            callback(result)
          )
            .join("");
        },
        count: (params: any) => {
          return queryContents(contents, { ...params, limit: 1, count: true });
        },
        partial: (name: string, params?: any) => {
          const tmpl = partialsCache.get(name);
          if (!tmpl) {
            throw new Error(`partial not found. name: ${name}`);
          }
          const context = createContext({
            ...params,
            ...builtins,
            _params: { ...params },
          });
          return renderHTML(tmpl, context);
        },
        notFound: () => {
          throw new NotFoundError();
        },
        escape,
        unescape,
      },
    };

    const encoder = new TextEncoder();
    const renderHTMLContext = createContext(
      contents.proxy({ ...builtins }),
    );

    if (resourceType === ResourceType.HTML) {
      const tmpl = await this.#getHTMLTemplate(path);
      const content = renderHTML(
        tmpl,
        renderHTMLContext,
      );

      if (!content) {
        return {
          route: route,
          errorStatus: 404,
          errorMessage: "not found",
        };
      }

      // parse rendered HTML
      const doc = new RenderableDocument(content);

      let outputRoute = route;
      const ext = extname(route);
      if (ext === "") {
        outputRoute = join(route, "index.html");
      }

      return {
        route: outputRoute,
        content: doc,
        resourceType,
      };
    } else if (resourceType === ResourceType.XML) {
      const tmpl = await this.#getHTMLTemplate(path);
      const content = renderHTML(
        tmpl,
        renderHTMLContext,
      );

      if (!content) {
        return {
          route: route,
          errorStatus: 404,
          errorMessage: "not found",
        };
      }

      let outputRoute = route;
      const ext = extname(route);
      if (ext === "") {
        outputRoute = join(route, "index.xml");
      }

      return {
        route: outputRoute,
        content: encoder.encode(content),
        resourceType,
      };
    } else if (resourceType === ResourceType.CSS) {
      const tailwindConfig = await getTailwindConfig(
        config,
        srcPath,
      );
      const content = await renderCSS(path, opts?.usedBy, tailwindConfig);
      return {
        route,
        content: encoder.encode(content),
        resourceType,
      };
    } else if (resourceType === ResourceType.JS) {
      const result = await renderJS(path, join(srcPath, config.dirs!.js!));
      return {
        route,
        content: encoder.encode(result.outputFiles[0].text),
        resourceType,
      };
    } else if (resourceType === ResourceType.IMAGE) {
      const { content } = await renderImage(path);
      return {
        route,
        content,
        resourceType,
      };
    } else if (
      resourceType === ResourceType.AUDIO || resourceType === ResourceType.VIDEO
    ) {
      const { content } = await renderMedia(path);
      return {
        route,
        content,
        resourceType,
      };
    } else {
      return {
        route: route,
        errorStatus: 400,
        errorMessage: "not supported yet",
      };
    }
  }
}
