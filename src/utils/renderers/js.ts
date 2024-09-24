import { join } from "@std/path";
import * as esbuild from "esbuild";
import { extname } from "@std/path";

import { Config } from "../../config/config.ts";

const loaders = {
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".ts": "ts",
  ".mts": "ts",
  ".cts": "ts",
  ".jsx": "jsx",
  ".tsx": "tsx",
  ".json": "json",
};

export async function getTsConfig(
  tsconfig: undefined | string | unknown,
  srcPath: string,
): Promise<string | undefined> {
  if (!tsconfig) {
    return;
  }

  // read the config from given path
  // has to be a JSON file (tailwind.config.js isn't supported)
  if (typeof tsconfig === "string") {
    try {
      return await Deno.readTextFile(join(srcPath, tsconfig));
    } catch (e) {
      console.error("failed to read and parse tsconfig", e);
    }
  } else {
    return JSON.stringify(tsconfig);
  }
}

export async function renderJS(
  path: string,
  resolveDir: string,
  tsconfigRaw?: string,
): Promise<any> {
  try {
    const raw = await Deno.readTextFile(path);
    const ext = extname(path);
    let result = await esbuild.build({
      stdin: {
        contents: raw,
        loader: loaders[ext as keyof typeof loaders] as esbuild.Loader ?? "js",
        resolveDir,
      },
      tsconfigRaw,
      format: "iife",
      bundle: true,
      minify: true,
      //sourcemap: true,
      write: false,
    });
    esbuild.stop();
    return result;
  } catch (e) {
    throw new Error(`failed to render JS file - ${path}`, { cause: e });
  }
}
