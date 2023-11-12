import { extname, join, relative } from "std/path/mod.ts";
import Handlebars from "handlebars";
import { HTMLDocument } from "deno_dom";

import { Contents } from "./contents.ts";
import { Config } from "../config/config.ts";
import { findResource, getRouteParams, ResourceType } from "../utils/routes.ts";
import { renderHTML } from "../utils/renderers/html.ts";
import { RenderableDocument } from "../utils/dom.ts";
import { getElements } from "../utils/elements.ts";

export interface Context {
  srcPath: string;
  config: Config;
  contents: Contents;
}

export interface Output {
  route: string;
  contentType?: string;
  content?: string | RenderableDocument;
  errorStatus?: number;
  errorMessage?: string;
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

  async render(route: string): Promise<Output> {
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
    if (resourceType === ResourceType.HTML) {
      contents.setDefaults({
        route: getRouteParams(
          route,
          relative(join(srcPath, config.dirs!.pages!), path),
        ),
      });

      const content = await renderHTML(this.#handlebarsEnv, path, contents);

      // parse rendered HTML
      const doc = new RenderableDocument(content);

      // extract assets (scripts and stylesheets)
      const assets = doc.assets;

      let outputRoute = route;
      const ext = extname(route);
      if (ext === "") {
        outputRoute = join(route, "index.html");
      }

      return {
        route: outputRoute,
        contentType: "text/html",
        content: doc,
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
