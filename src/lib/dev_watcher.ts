import { debounce } from "std/async/mod.ts";

onmessage = async (e) => {
  const { srcPath } = e.data;
  let watcher = Deno.watchFs(srcPath || "./");

  const notify = debounce((paths: string[]) => {
    postMessage({ paths });
  }, 200);

  for await (const event of watcher) {
    notify(event.paths);
  }
};
