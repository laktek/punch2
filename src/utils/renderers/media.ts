import { extname } from "std/path/mod.ts";

interface Result {
  content: Uint8Array;
}

export async function renderMedia(path: string): Promise<Result> {
  try {
    const content = await Deno.readFile(path);
    return { content };
  } catch (e) {
    throw new Error(`failed to render media file - ${path}`, { cause: e });
  }
}
