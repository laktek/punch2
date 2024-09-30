import { ImageMagick, initializeImageMagick, MagickFormat } from "magick-wasm";
import { extname } from "@std/path";

const wasmBytes = await Deno.readFile(
  new URL("magick.wasm", import.meta.resolve("magick-wasm")),
);
await initializeImageMagick(
  wasmBytes,
);

export interface ImageMetadata {
  ext: string;
  width: number;
  height: number;
}

interface Result {
  content: Uint8Array;
  metadata: ImageMetadata;
}

export async function renderImage(path: string): Promise<Result> {
  try {
    const content = await Deno.readFile(path);
    const ext = extname(path);

    let result = ImageMagick.read(
      content,
      (img): Uint8Array => {
        const width = img.width;
        const height = img.height;

        // perform webp conversion on following extensions
        const convert_exts = [".png", ".jpg", ".jpeg"];

        if (!convert_exts.includes(ext)) {
          return { content, metadata: { width, height, ext } };
        }

        const finalContent = img.write(
          MagickFormat.WebP,
          (data) => {
            const copy = new Uint8Array(data.length);
            copy.set(data);
            return copy;
          },
        );

        return {
          content: finalContent,
          metadata: { width, height, ext: ".webp" },
        };
      },
    );

    return result;
  } catch (e) {
    throw new Error(`failed to render image file - ${path}`, { cause: e });
  }
}
