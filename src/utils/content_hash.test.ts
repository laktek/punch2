import { assertEquals } from "@std/assert";
import { hashContent, routeWithContentHash } from "./content_hash.ts";

Deno.test("hashContent", async (t) => {
  await t.step("returns a sha256 hash of the given content", async () => {
    assertEquals(
      (await hashContent(new TextEncoder().encode("hello world"))).length,
      64,
      "expected a sha256 string",
    );
  });
});

Deno.test("routeWithContentHash", async (t) => {
  await t.step("when hash is empty return route unmodified", () => {
    assertEquals(
      routeWithContentHash("/js/main.js", undefined),
      "/js/main.js",
      "expected route to not change",
    );
    assertEquals(
      routeWithContentHash("/js/main.js", ""),
      "/js/main.js",
      "expected route to not change",
    );
  });
  await t.step("returns a route with content hash appended", () => {
    assertEquals(
      routeWithContentHash("/js/main.js", "abcd1234"),
      "/js/main.abcd1234.js",
      "expected hash to be appended",
    );

    assertEquals(
      routeWithContentHash("/some-file", "abcd1234"),
      "/some-file.abcd1234",
      "expected hash to be appended",
    );
  });
});
