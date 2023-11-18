import { join } from "std/path/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { exists } from "std/fs/mod.ts";

import { copyPublicFiles } from "./public.ts";

Deno.test("copyPublicFiles", async (t) => {
  const tmpDir = await Deno.makeTempDir();

  const publicPath = join(tmpDir, "public");
  await Deno.mkdir(publicPath);

  await Deno.writeTextFile(join(publicPath, "robots.txt"), "robots");
  await Deno.mkdir(join(publicPath, "path_a"));
  await Deno.writeTextFile(join(publicPath, "path_a", "a.txt"), "foo");
  await Deno.writeTextFile(join(publicPath, ".foo"), "foo");

  await Deno.writeTextFile(join(tmpDir, "bar.txt"), "bar");
  await Deno.symlink(
    join(tmpDir, "bar.txt"),
    join(tmpDir, "public", "symlink.txt"),
  );

  await Deno.writeTextFile(join(tmpDir, "public/path_a", "baz.txt"), "baz");
  await Deno.symlink(
    join(tmpDir, "public/path_a", "baz.txt"),
    join(tmpDir, "public", "symlink2.txt"),
  );

  const destDir = await Deno.makeTempDir();

  await t.step("copy files in public/", async () => {
    await copyPublicFiles(publicPath, destDir);

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
