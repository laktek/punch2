import { Command } from "commander";

import { build } from "./commands/build.ts";
import { serve } from "./commands/serve.ts";
import { newSite } from "./commands/new.ts";
import { dev } from "./commands/dev.ts";
import { version } from "./version.ts";

const program = new Command();

program
  .name("punch")
  .description("A tool to build, publish, and serve web sites")
  .version(version || "0.0.0");

program.command("new")
  .description("create a new site")
  .argument("[PATH]", "path to create the new site")
  .option("-f, --force", "overwrite existing files")
  .action((path: string, options: any) => {
    newSite(path, options);
  });

program.command("dev")
  .description(
    "start the dev server for the site (it will watch files and rebuild on changes)",
  )
  .argument("[PATH]", "path of the site to build")
  .option("-p, --port <PORT>", "port to listen on", "8008")
  .option("-c, --config <PATH>", "path for the config file", "punch.jsonc")
  .action((path = "", options: any) => {
    dev({ srcPath: path, ...options });
  });

program.command("build")
  .description("produce a static output of the site suitable for hosting")
  .argument("[PATH]", "path of the site to build")
  .option("-o, --output <DIR>", "output directory for the built site")
  .option("-c, --config <PATH>", "path for the config file", "punch.jsonc")
  .option("-q, --quiet", "suppress build logs")
  .option(
    "--base-url <URL>",
    "Base URL of the site (used for sitemap.xml)",
  )
  .action((path = "", options: any) => {
    build({ srcPath: path, ...options });
  });

program.command("serve")
  .description(
    "serve a single or multiple sites in production mode",
  )
  .option("-S, --sites <PATH>", "path for the multi-site config", "sites.json")
  .option("-p, --port <PORT>", "port to listen on", "8080")
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
    "publish the site to a host",
  )
  .action(() => {
    console.log("This feature is not implemented yet.");
  });

program.command("import")
  .description(
    "import any existing website and convert it to a Punch compatible site",
  )
  .action(() => {
    console.log("This feature is not implemented yet.");
  });

program.command("upgrade")
  .description(
    "upgrade Punch to the latest version",
  )
  .action(() => {
    console.log("This feature is not implemented yet.");
  });

program.parse();
