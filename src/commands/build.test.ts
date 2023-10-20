import { join, toFileUrl } from "https://deno.land/std@0.204.0/path/mod.ts";
import { assert } from "https://deno.land/std@0.204.0/testing/asserts.ts";

import { build } from "./build.ts";

Deno.test("build", async (t) => {
  const src = toFileUrl(join(Deno.cwd(), "./testdata/site_1"));
  const destDir = await Deno.makeTempDir();
  const dest = toFileUrl(destDir);

  await t.step("copy files in public/", async () => {
    await build(src, dest);

    const robotsTxt = await Deno.stat(join(destDir, "robots.txt"));
    assert(robotsTxt.isFile);

    const fileInsideDirectory = await Deno.stat(
      join(destDir, "path_a", "a.txt"),
    );
    assert(fileInsideDirectory.isFile);

    const symlinkFile = await Deno.stat(
      join(destDir, "symlink.txt"),
    );
    assert(symlinkFile.isFile);

    const decoder = new TextDecoder("utf-8");
    const symlinkFile2 = await Deno.readFile(
      join(destDir, "symlink2.txt"),
    );
    assert(decoder.decode(symlinkFile2) === "test data A\n");
  });

  await Deno.remove(destDir, { recursive: true });
});
