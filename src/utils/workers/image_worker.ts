import { renderImage } from "../renderers/image.ts";

interface InputMessage {
  path: string;
}

(globalThis as any).onmessage = async (e: { data: InputMessage }) => {
  const { path } = e.data;
  const result = await renderImage(path);
  (globalThis as any).postMessage({ path, result }, [result.content.buffer]);
};
