import { dirname } from "std/path/mod.ts";

export async function writeFile(path: string, data: string) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(
    path,
    data,
  );
}
