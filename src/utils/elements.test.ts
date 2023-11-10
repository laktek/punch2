import { assertArrayIncludes, assertEquals } from "std/testing/asserts.ts";
import Handlebars from "handlebars";
import { join } from "std/path/mod.ts";

import { getElements } from "./elements.ts";

Deno.test("getElements", async (t) => {
  const elementsDir = await Deno.makeTempDir();
  const handlebarsEnv = Handlebars.create();

  await t.step(
    "returns an empty object if elements directory does not exist",
    async () => {
      const elements = await getElements("/var/punch/no-exist", handlebarsEnv);
      assertEquals(
        elements,
        {},
        "expected an empty object",
      );
    },
  );

  await t.step(
    "skips directories inside elements",
    async () => {
      const paths = [
        "partial1.html",
        "partial2.html",
        "foo/partial3.html",
      ];
      await Deno.mkdir(join(elementsDir, "/foo"));

      paths.forEach(async (p) =>
        await Deno.writeTextFile(join(elementsDir, p), "test")
      );

      const elements = await getElements(elementsDir, handlebarsEnv);
      assertArrayIncludes(
        Object.keys(elements),
        ["partial1", "partial2"],
        "expected to skip directories",
      );
    },
  );

  await t.step(
    "skips dotfiles",
    async () => {
      const paths = [
        "partial1.html",
        "partial2.html",
        ".partial3.html",
      ];
      paths.forEach(async (p) =>
        await Deno.writeTextFile(join(elementsDir, p), "test")
      );

      const elements = await getElements(elementsDir, handlebarsEnv);
      assertArrayIncludes(
        Object.keys(elements),
        ["partial1", "partial2"],
        "expected to skip dotfiles",
      );
    },
  );

  await t.step(
    "strips non-alphanumeric characters",
    async () => {
      const paths = [
        "partial1.html",
        "partial2.html",
        "_partial3.html",
        "__partial4.html",
        "[partial5].html",
        "partial_6",
      ];
      paths.forEach(async (p) =>
        await Deno.writeTextFile(join(elementsDir, p), "test")
      );

      const elements = await getElements(elementsDir, handlebarsEnv);
      assertArrayIncludes(
        Object.keys(elements),
        [
          "partial1",
          "partial2",
          "partial3",
          "partial4",
          "partial5",
          "partial_6",
        ],
        "expected to strip non-alphanumeric chars",
      );
    },
  );

  await Deno.remove(elementsDir, { recursive: true });
});
