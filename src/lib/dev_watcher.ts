import { debounce } from "@std/async";

interface Options {
  srcPath: string;
}

(globalThis as any).onmessage = async (e: { data: Options }) => {
  const { srcPath } = e.data;
  let watcher = Deno.watchFs(srcPath || "./");

  const notify = debounce((paths: string[]) => {
    (globalThis as any).postMessage({ paths });
  }, 200);

  for await (const event of watcher) {
    notify(event.paths);
  }
};
