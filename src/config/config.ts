import { extname } from "std/path/mod.ts";
import { parse as yamlParse } from "std/yaml/mod.ts";
import { parse as tomlParse } from "std/toml/mod.ts";
import { deepMerge } from "std/collections/deep_merge.ts";

interface RedirectValue {
  destination: string;
  permanent: boolean;
}

export interface Config {
  srcPath?: string;
  output?: string;
  routes?: string[];
  redirects?: Record<string, RedirectValue>;
  dirs?: {
    public?: string;
    pages?: string;
    contents?: string;
    elements?: string;
    css?: string;
    js?: string;
    images?: string;
    feeds?: string;
  };
  modifiers?: {
    renderer?: string;
    middleware?: string;
  };
}

async function parseConfig(configPath: string): Promise<unknown> {
  const ext = extname(configPath);
  const data = await Deno.readTextFile(configPath);

  if (ext === ".json") {
    return JSON.parse(data);
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
    srcPath: "",
    output: "dist",
    dirs: {
      public: "public",
      pages: "pages",
      contents: "contents",
      elements: "elements",
      css: "css",
      js: "js",
      images: "images",
      feeds: "feeds",
      fonts: "fonts",
      media: "media", // audio, video, 3d files
    },
    routes: [],
    redirects: {},
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
