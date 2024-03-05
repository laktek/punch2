import { extname, join, relative } from "std/path/mod.ts";
import Handlebars from "handlebars";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, getRouteParams, ResourceType } from "../utils/routes.ts";
import { renderHTML } from "../utils/renderers/html.ts";
import { getTailwindConfig, renderCSS } from "../utils/renderers/css.ts";
import { renderJS } from "../utils/renderers/js.ts";
import { renderImage } from "../utils/renderers/image.ts";
import { renderMedia } from "../utils/renderers/media.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { getElements } from "../utils/elements.ts";

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

function queryContents(contents: Contents, key: string, options: any) {
  const { offset, order_by, limit, ...where } = options;
  return contents.query(key, {
    limit: limit,
    where: Object.entries(where).map(([k, v]) => [k, v]),
    offset: offset,
    order_by: order_by,
  });
}

export class Renderer {
  context: Context;

  #handlebarsEnv: any;

  constructor(context: Context) {
    this.context = context;

    this.setupHandlebars();
  }

  static async init(context: Context) {
    const renderer = new Renderer(context);
    await renderer.setupHandlebars();
    return renderer;
  }

  async setupHandlebars() {
    const { srcPath, config, contents } = this.context;

    this.#handlebarsEnv = Handlebars.create();

    // register elements as partials
    const elementsPath = join(
      srcPath,
      config.dirs!.elements!,
    );
    const partials = await getElements(elementsPath, this.#handlebarsEnv);
    this.#handlebarsEnv.registerPartial(partials);

    // register helpers
    const helpers = {
      get_one: (key: string, options: { hash: any }) => {
        const results = queryContents(contents, key, {
          ...options.hash,
          limit: 1,
        });
        return results[0];
      },
      get_all: (key: string, options: { hash: any }) => {
        return queryContents(contents, key, options.hash);
      },
    };
    this.#handlebarsEnv.registerHelper(helpers);
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
      route: getRouteParams(
        route,
        relative(join(srcPath, config.dirs!.pages!), path),
      ),
    };

    const encoder = new TextEncoder();

    if (resourceType === ResourceType.HTML) {
      const content = await renderHTML(
        this.#handlebarsEnv,
        path,
        contents,
        builtins,
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
      const content = await renderHTML(
        this.#handlebarsEnv,
        path,
        contents,
        builtins,
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
