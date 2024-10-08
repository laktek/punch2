import { assert, assertRejects } from "@std/assert";
import { join } from "@std/path";

import { stringify as yamlStringify } from "@std/yaml";
import { stringify as tomlStringify } from "@std/toml";

import { getConfig } from "./config.ts";

Deno.test("getConfig", async (t) => {
  const configDir = await Deno.makeTempDir();

  await t.step("no config file path provided", async () => {
    const config = await getConfig();
    assert(config.dirs!.public! === "public", "public path didn't match");
  });

  await t.step("no config file available", async () => {
    const config = await getConfig("./no_config.json");
    assert(config.dirs!.public! === "public", "public path didn't match");
  });

  await t.step("parses json config file", async () => {
    const configFile = join(configDir, "config.json");
    await Deno.writeTextFile(
      configFile,
      '{ "dirs": { "public": "custom-public", } }',
    );

    const config = await getConfig(configFile);
    assert(
      config.dirs!.public! === "custom-public",
      "public path didn't match",
    );
    assert(config.dirs!.pages! === "pages", "pages path didn't match");
  });

  await t.step("parses yaml config file", async () => {
    const configFile = join(configDir, "config.yaml");
    await Deno.writeTextFile(
      configFile,
      yamlStringify({ dirs: { public: "custom-public" } }),
    );

    const config = await getConfig(configFile);
    assert(
      config.dirs!.public! === "custom-public",
      "public path didn't match",
    );
    assert(config.dirs!.pages! === "pages", "pages path didn't match");
  });

  await t.step("parses toml config file", async () => {
    const configFile = join(configDir, "config.toml");
    await Deno.writeTextFile(
      configFile,
      tomlStringify({ dirs: { public: "custom-public" } }),
    );

    const config = await getConfig(configFile);
    assert(
      config.dirs!.public! === "custom-public",
      "public path didn't match",
    );
    assert(config.dirs!.pages! === "pages", "pages path didn't match");
  });

  await t.step("throws an error for unrecongized format", async () => {
    const configFile = join(configDir, "config.txt");
    await Deno.writeTextFile(
      configFile,
      "foo",
    );

    assertRejects(async () => {
      await getConfig(configFile);
    }, "expected to throw an error");
  });

  await t.step("overriding config", async () => {
    const configFile = join(configDir, "config.json");
    await Deno.writeTextFile(
      configFile,
      JSON.stringify({ dirs: { public: "custom-public" }, "output": "out" }),
    );

    const config = await getConfig(configFile, {
      dirs: { public: "overidden-public" },
    });
    assert(
      config.dirs!.public! === "overidden-public",
      "override config property didn't match'",
    );
    assert(config.output! === "out", "custom config property didn't match");
    assert(config.dirs!.pages! === "pages", "default property didn't match");
  });

  await Deno.remove(configDir, { recursive: true });
});
