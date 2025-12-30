import { renderImage } from "../renderers/image.ts";

interface InputMessage {
  key: string;
  msg?: {
    bootstrap?: boolean;
    format?: "webp" | "avif";
  };
}

let imageFormat: "webp" | "avif" = "webp";

(globalThis as any).onmessage = async (e: { data: InputMessage }) => {
  const { key, msg } = e.data;

  // Handle bootstrap message
  if (msg?.bootstrap) {
    if (msg.format) {
      imageFormat = msg.format;
    }
    (globalThis as any).postMessage({ key, result: true });
    return;
  }

  try {
    const result = await renderImage(key, imageFormat);
    (globalThis as any).postMessage({ key, result }, [result.content.buffer]);
  } catch (error) {
    (globalThis as any).postMessage({ key, error });
  }
};
