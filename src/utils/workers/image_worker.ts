import { renderImage } from "../renderers/image.ts";

interface InputMessage {
  key: string;
}

(globalThis as any).onmessage = async (e: { data: InputMessage }) => {
  const { key } = e.data;
  const result = await renderImage(key);
  (globalThis as any).postMessage({ key, result }, [result.content.buffer]);
};
