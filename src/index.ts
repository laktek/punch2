import { Command } from "commander";

import { build } from "./commands/build.ts";
import { serve } from "./commands/serve.ts";
import { newSite } from "./commands/new.ts";

const program = new Command();

program
  .name("punch")
  .description("A fast and simple static site builder")
  .version("0.0.1");

program.command("new")
  .description("create a new site")
  .argument("[path]", "path to create the new site (default: current path)")
  .option("-f, --force", "overwrite existing files")
  .action((path: string, options: any) => {
    newSite(path, options);
  });

program.command("dev")
  .description("run the site in dev mode (detects and rebuilds changed pages)")
  .action(() => {
    console.log("not implemented");
  });

program.command("build")
  .description("generate a site suitable for hosting")
  .argument("[SOURCE]", "path of the site to build")
  .option("-o, --output <DIR>", "output directory for the built site")
  .option("-c, --config <PATH>", "path for the config file")
  .action((path = "", options: any) => {
    build({ srcPath: path, ...options });
  });

program.command("serve")
  .description(
    "serves a site in production mode",
  )
  .option("-S, --sites <PATH>", "path for the multi-site config", "sites.json")
  .option("-p, --port <PORT>", "port to listen on", "8008")
  .option(
    "-H, --hostname <HOST>",
    "hostname of the server",
    "0.0.0.0",
  )
  .option(
    "--cert-path <PATH>",
    "path for the cert to be used for HTTPS in PEM format",
  )
  .option(
    "--key-path <PATH>",
    "path for the private key used for HTTPS in PEM format",
  )
  .action((options: any) => {
    serve({ ...options });
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
