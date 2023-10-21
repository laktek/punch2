import { join, toFileUrl } from "std/path/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { exists } from "std/fs/mod.ts";

import { build } from "./build.ts";

Deno.test("build", async (t) => {
  const srcPath = join(Deno.cwd(), "./testdata/site_1");
  const destDir = await Deno.makeTempDir();
  const destPath = destDir;

  const opts = {
    srcPath,
    destPath,
  };

  await t.step("copy files in public/", async () => {
    await build(opts);

    assert(await exists(join(destDir, "robots.txt"), { isReadable: true }));

    // file in a directory
    assert(
      await exists(
        join(destDir, "path_a", "a.txt"),
        { isReadable: true },
      ),
    );

    // symlink
    assert(
      await exists(
        join(destDir, "symlink.txt"),
        { isReadable: true },
      ),
    );

    // symlink 2
    assert(
      await exists(
        join(destDir, "symlink2.txt"),
        { isReadable: true },
      ),
    );

    // dotfile
    assert(
      await exists(
        join(destDir, ".foo"),
        { isReadable: true },
      ) === false,
    );
  });

  await Deno.remove(destDir, { recursive: true });
});
