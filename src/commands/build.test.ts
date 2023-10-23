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

    assert(
      await exists(join(destDir, "robots.txt"), { isReadable: true }),
      "failed to read top-level file",
    );

    // file in a directory
    assert(
      await exists(
        join(destDir, "path_a", "a.txt"),
        { isReadable: true },
      ),
      "failed to read  file inside a directory",
    );

    // symlink
    assert(
      await exists(
        join(destDir, "symlink.txt"),
        { isReadable: true },
      ),
      "failed to read symlink file outside of public directory",
    );

    // symlink 2
    assert(
      await exists(
        join(destDir, "symlink2.txt"),
        { isReadable: true },
      ),
      "failed to read symlink file inside of public directory",
    );

    // dotfile
    assert(
      await exists(
        join(destDir, ".foo"),
        { isReadable: true },
      ) === false,
      "should not copy dotfiles",
    );
  });

  await Deno.remove(destDir, { recursive: true });
});
