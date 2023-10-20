import { Command } from "npm:commander";
import { buildCmd } from "./commands/build.ts";
const program = new Command();

program
  .name("punch")
  .description("A fast and simple static site builder")
  .version("0.0.1");

program.command("new")
  .description("create a new site")
  .argument("[path]", "path to create the new site (default: current path)")
  .option("--template", "URL of the template to use")
  .action((path: string, options) => {
    console.log("not implemented");
  });

program.command("dev")
  .description("run the site in dev mode (detects and rebuilds changed pages)")
  .action(() => {
    console.log("not implemented");
  });

program.command("build")
  .description("generate a static site suitable for hosting")
  .action(buildCmd);

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
