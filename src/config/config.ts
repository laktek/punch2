import { extname } from "@std/path";
import { parse as yamlParse } from "@std/yaml";
import { parse as tomlParse } from "@std/toml";
import { parse as jsonParse } from "@std/jsonc";
import { deepMerge } from "@std/collections";

interface RedirectValue {
  destination: string;
  permanent: boolean;
}

interface ServeLoggingOpts {
  disabled: boolean;
  path: string;
}

interface OndemandRenderOpts {
  disabled: boolean;
}

interface CssOpts {
  browserTargets?: string | string[];
}

interface JsOpts {
  tsconfig?: string;
}

export interface Config {
  output?: string;
  baseURL?: string;
  routes?: string[];
  redirects?: Record<string, RedirectValue>;
  dirs?: {
    public?: string;
    pages?: string;
    contents?: string;
    partials?: string;
    helpers?: string;
    css?: string;
    js?: string;
    images?: string;
    feeds?: string;
    audio?: string;
    videos?: string;
  };
  modifiers?: {
    renderer?: string;
    middleware?: string;
  };
  build?: {
    batchSize?: number;
    sitemap?: boolean;
  };
  serve?: {
    logging?: ServeLoggingOpts;
    timestamp?: "utc" | "local";
    ondemandRender?: OndemandRenderOpts;
  };
  assets?: {
    css?: CssOpts;
    js?: JsOpts;
  };
  db?: {
    path?: string;
    indexes?: Record<string, string[]>;
  };
}

async function parseConfig(configPath: string): Promise<unknown> {
  const ext = extname(configPath);
  const data = await Deno.readTextFile(configPath);

  if (ext === ".json" || ext === ".jsonc") {
    return jsonParse(data);
  } else if (ext === ".yaml" || ext === ".yml") {
    return yamlParse(data);
  } else if (ext === ".toml") {
    return tomlParse(data);
  } else {
    throw new Error("unrecognized config file");
  }
}

export async function getConfig(
  configPath?: string,
  overrides?: Record<PropertyKey, unknown>,
): Promise<Config> {
  const defaultConfig = {
    output: "dist",
    dirs: {
      public: "public",
      pages: "pages",
      contents: "contents",
      partials: "partials",
      helpers: "helpers",
      css: "css",
      js: "js",
      images: "images",
      feeds: "feeds",
      fonts: "fonts",
      audio: "audio",
      videos: "videos",
    },
    routes: [],
    redirects: {},
    build: {
      batchSize: 100,
      sitemap: true,
    },
  };

  if (!configPath) {
    return defaultConfig;
  }

  try {
    let customConfig = await parseConfig(configPath);
    if (overrides) {
      customConfig = deepMerge(
        customConfig as Record<PropertyKey, unknown>,
        overrides,
      );
    }
    return deepMerge(
      defaultConfig,
      customConfig as Record<PropertyKey, unknown>,
    );
  } catch (e) {
    if ((e instanceof Deno.errors.NotFound)) {
      return defaultConfig;
    }
    throw e;
  }
}

export interface SiteConfig {
  srcPath: string;
  configPath?: string;
}

export async function getSitesConfig(
  configPath: string,
): Promise<Record<string, SiteConfig> | undefined> {
  try {
    const config = await parseConfig(configPath) as Record<string, SiteConfig>;
    return config;
  } catch (e) {
    if ((e instanceof Deno.errors.NotFound)) {
      return {
        "*": {
          srcPath: "",
        },
      };
    }
    throw e;
  }
}
