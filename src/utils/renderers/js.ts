import * as esbuild from "esbuild";
import { extname } from "std/path/mod.ts";

const loaders = {
  ".js": "js",
  ".ts": "ts",
  ".jsx": "jsx",
  ".tsx": "tsx",
  ".json": "json",
};

export async function renderJS(
  path: string,
  resolveDir: string,
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
      jsx: "automatic",
      format: "esm",
      bundle: true,
      minify: true,
      //sourcemap: true,
      write: false,
    });
    return result;
  } catch (e) {
    throw new Error(`failed to render JS file - ${path}`, { cause: e });
  }
}
