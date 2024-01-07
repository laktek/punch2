import { assertEquals } from "std/testing/asserts.ts";
import { hashContent, routeWithContentHash } from "./content_hash.ts";

Deno.test("hashContent", async (t) => {
  await t.step("returns a sha256 hash of the given content", async () => {
    assertEquals(
      (await hashContent("hello world")).length,
      64,
      "expected a sha256 string",
    );
  });
});

Deno.test("routeWithContentHash", async (t) => {
  await t.step("returns a route with content hash appended", async () => {
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
