import { extname } from "std/path/mod.ts";

interface Result {
  content: Uint8Array;
}

export async function renderImage(path: string): Promise<Result> {
  try {
    const content = await Deno.readFile(path);
    return { content };
  } catch (e) {
    throw new Error(`failed to render image file - ${path}`, { cause: e });
  }
}
