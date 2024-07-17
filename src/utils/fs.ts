import { dirname } from "@std/path";

export async function writeFile(path: string, data: Uint8Array) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeFile(
    path,
    data,
  );
}
