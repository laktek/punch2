import { extname, join } from "https://deno.land/std@0.204.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.204.0/fs/mod.ts";
import { parse as yamlParse } from "https://deno.land/std@0.204.0/yaml/mod.ts";
import { parse as tomlParse } from "https://deno.land/std@0.204.0/toml/mod.ts";
import { deepMerge } from "https://deno.land/std@0.204.0/collections/deep_merge.ts";

interface Config {
  routes?: string[];
  dirs?: {
    public?: string;
    pages?: string;
    contents?: string;
    elements?: string;
  };
  modifiers?: {
    generator?: string;
    prepare_contents?: string;
    get_custom_element?: string;
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

export async function getConfig(configPath: string): Promise<Config> {
  const defaultConfig = {
    dirs: {
      public: "public",
      pages: "pages",
      contents: "contents",
      elements: "elements",
    },
  };

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
