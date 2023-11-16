import { extname, join } from "std/path/mod.ts";
import { exists } from "std/fs/mod.ts";
import { parse as yamlParse } from "std/yaml/mod.ts";
import { parse as tomlParse } from "std/toml/mod.ts";
import { deepMerge } from "std/collections/deep_merge.ts";

export interface Config {
  routes?: string[];
  dirs?: {
    public?: string;
    pages?: string;
    contents?: string;
    elements?: string;
    css?: string;
    js?: string;
    images?: string;
  };
  modifiers?: {
    renderer?: string;
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
): Promise<Config> {
  const defaultConfig = {
    dirs: {
      public: "public",
      pages: "pages",
      contents: "contents",
      elements: "elements",
      css: "css",
      js: "js",
      images: "images",
    },
    routes: [],
  };

  if (!configPath) {
    return defaultConfig;
  }

  try {
    const customConfig = await parseConfig(configPath);
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
