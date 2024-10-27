import { renderImage } from "../renderers/image.ts";

interface InputMessage {
  key: string;
}

(globalThis as any).onmessage = async (e: { data: InputMessage }) => {
  const { key } = e.data;

  try {
    const result = await renderImage(key);
    (globalThis as any).postMessage({ key, result }, [result.content.buffer]);
  } catch (error) {
    (globalThis as any).postMessage({ key, error });
  }
};
