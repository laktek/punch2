import { extname, join, relative } from "std/path/mod.ts";
import { createContext } from "node:vm";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, getRouteParams, ResourceType } from "../utils/routes.ts";
import { renderHTML } from "../utils/renderers/html.ts";
import { getTailwindConfig, renderCSS } from "../utils/renderers/css.ts";
import { renderJS } from "../utils/renderers/js.ts";
import { renderImage } from "../utils/renderers/image.ts";
import { renderMedia } from "../utils/renderers/media.ts";
import { RenderableDocument } from "../utils/dom.ts";

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
  const { from, offset, order_by, limit, ...where } = params;
  return contents.query(from, {
    limit: limit,
    where: Object.entries(where).map(([k, v]) => [k, v]),
    offset: offset,
    order_by: order_by,
  });
}

export class Renderer {
  context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  static async init(context: Context) {
    return new Renderer(context);
  }

  async refresh() {
    // noop
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

    const builtins = {
      console,
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
        partial: (name: string, params?: any) => {
          // TODO: make a helper method - make extension optional
          const path = join(srcPath, config.dirs!.partials!, name + ".html");
          const context = createContext({ ...params, ...builtins });
          return renderHTML(path, context);
        },
      },
    };

    const encoder = new TextEncoder();
    const renderHTMLContext = createContext(
      contents.proxy({ ...builtins }),
    );

    if (resourceType === ResourceType.HTML) {
      const content = renderHTML(
        path,
        renderHTMLContext,
      );

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
      const content = renderHTML(
        path,
        renderHTMLContext,
      );

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
