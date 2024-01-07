import { crypto } from "std/crypto/mod.ts";
import { encodeHex } from "std/encoding/hex.ts";
import { extname } from "std/path/mod.ts";

export async function hashContent(content: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );

  return encodeHex(hash);
}

export function routeWithContentHash(
  route: string,
  hash: string,
): string {
  const ext = extname(route);
  if (ext) {
    return route.replace(ext, `.${hash}${ext}`);
  } else {
    return `${route}.${hash}`;
  }
}
