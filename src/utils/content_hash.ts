import { crypto } from "@std/crypto";
import { encodeHex } from "@std/encoding";
import { extname } from "@std/path";

export async function hashContent(content: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    content,
  );

  return encodeHex(hash);
}

export function routeWithContentHash(
  route: string,
  hash?: string,
): string {
  const ext = extname(route);
  if (!hash) {
    return route;
  }
  if (ext) {
    return route.replace(ext, `.${hash}${ext}`);
  } else {
    return `${route}.${hash}`;
  }
}
