import { assert, assertEquals } from "std/testing/asserts.ts";

import { RenderableDocument } from "./dom.ts";

Deno.test("new RenderableDocument()", async (t) => {
  await t.step(
    "empty content",
    () => {
      const doc = new RenderableDocument("");

      assertEquals(
        doc.document,
        null,
        "expected to return null for empty content",
      );
    },
  );

  await t.step(
    "valid document",
    () => {
      const doc = new RenderableDocument("<html foo='bar'></html>");

      assertEquals(
        doc.document!.documentElement!.outerHTML,
        '<html foo="bar"><head></head><body></body></html>',
        "expected to return a HTML doc",
      );
    },
  );
});

Deno.test("toString()", async (t) => {
  await t.step(
    "valid HTML document",
    () => {
      const doc = new RenderableDocument(
        "<html><head><title>foo</title></head><body><h1>bar</h1></body></html>",
      );

      assertEquals(
        doc.toString(),
        "<!doctype html><html><head><title>foo</title></head><body><h1>bar</h1></body></html>",
        "expected the DOM to converted to a string",
      );
    },
  );
});

Deno.test("getAssets", async (t) => {
  await t.step(
    "HTML doc without any assets",
    () => {
      const doc = new RenderableDocument("");

      assertEquals(doc.assets, {
        js: [],
        css: [],
      }, "expected an ampty assets object");
    },
  );

  await t.step(
    "skips inline scripts",
    () => {
      const doc = new RenderableDocument(
        "<html><body><script>alert('hello')</script></body>",
      );

      assertEquals(doc.assets, {
        js: [],
        css: [],
      }, "expected inline script to be skipped");
    },
  );

  await t.step(
    "returns scripts with src attribute set",
    () => {
      const doc = new RenderableDocument(
        "<html><body><script>alert('foo')</script><script src='/js/main.js'></script><script src='https://cdn.com/util.js'></script></body></html>",
      );

      assertEquals(doc.assets, {
        js: [
          "/js/main.js",
          "https://cdn.com/util.js",
        ],
        css: [],
      }, "expected to return external scripts");
    },
  );

  await t.step(
    "returns stylesheets with href attribute set",
    () => {
      const doc = new RenderableDocument(
        '<html><head><link rel="stylesheet" href="/css/main.css" /><link rel="stylesheet" href="https://cdn.com/util.css" /><link rel="icon" href="favicon.ico" /></head></html>',
      );

      assertEquals(doc.assets, {
        js: [],
        css: [
          "/css/main.css",
          "https://cdn.com/util.css",
        ],
      }, "expected to return external css");
    },
  );
});

Deno.test("updateAssetPaths", async (t) => {
  await t.step(
    "updates stylesheets path",
    () => {
      const doc = new RenderableDocument(
        '<html><head><link rel="stylesheet" href="/css/main.css" /><link rel="stylesheet" href="https://cdn.com/util.css" /><link rel="icon" href="favicon.ico" /></head></html>',
      );

      doc.updateAssetPaths("css", "/css/main.css", "/css/main.123.css");
      assert(
        doc.document!.querySelectorAll(
          'link[rel="stylesheet"][href="/css/main.123.css"]',
        ).length === 1,
        "expected to return updated css path",
      );
      assert(
        doc.document!.querySelectorAll(
          'link[rel="stylesheet"][href="/css/main.css"]',
        ).length === 0,
        "expected to not return old css path",
      );
      assert(
        doc.document!.querySelectorAll(
          'link[rel="stylesheet"][href="https://cdn.com/util.css"]',
        ).length === 1,
        "expected to other css paths to not be modified",
      );
    },
  );
  await t.step(
    "updates script path",
    () => {
      const doc = new RenderableDocument(
        "<html><body><script>alert('foo')</script><script src='/js/main.js'></script><script src='https://cdn.com/util.js'></script></body></html>",
      );

      doc.updateAssetPaths("js", "/js/main.js", "/js/main.123.js");
      assert(
        doc.document!.querySelectorAll(
          'script[src="/js/main.123.js"]',
        ).length === 1,
        "expected to return updated script path",
      );
      assert(
        doc.document!.querySelectorAll(
          'script[src="/js/main.js"]',
        ).length === 0,
        "expected to not return old script path",
      );
      assert(
        doc.document!.querySelectorAll(
          'script[src="https://cdn.com/util.js"]',
        ).length === 1,
        "expected to other script paths to not be modified",
      );
    },
  );
});
