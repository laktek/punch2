import { Command } from "commander";
import { resolve } from "std/path/mod.ts";

import { build } from "./commands/build.ts";

const program = new Command();

program
  .name("punch")
  .description("A fast and simple static site builder")
  .version("0.0.1");

program.command("new")
  .description("create a new site")
  .argument("[path]", "path to create the new site (default: current path)")
  .option("--template", "URL of the template to use")
  .action((_path: string, _options) => {
    console.log("not implemented");
  });

program.command("dev")
  .description("run the site in dev mode (detects and rebuilds changed pages)")
  .action(() => {
    console.log("not implemented");
  });

program.command("build")
  .description("generate a static site suitable for hosting")
  .argument("[path]", "path of the site to build")
  .option("--output", "output directory for the built site")
  .action((path: string, options: any) => {
    const srcPath = resolve(Deno.cwd(), path);
    const destPath = resolve(Deno.cwd(), options.out ?? "dist");
    build({ srcPath, destPath });
  });

program.command("serve")
  .description(
    "serves a static site in production mode with server-side rendering",
  )
  .action(() => {
    console.log("not implemented");
  });

program.command("publish")
  .description(
    "publish the site to punch.site",
  )
  .action(() => {
    console.log("not implemented");
  });

program.command("import")
  .description(
    "import any existing website and converts it to a Punch compatible site",
  )
  .action(() => {
    console.log("not implemented");
  });

program.parse();
