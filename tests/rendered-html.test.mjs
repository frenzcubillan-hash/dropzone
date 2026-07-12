import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the Dropzone product experience", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(page, /Welcome to Dropzone/);
  assert.match(page, /indexedDB\.open\("dropzone-files"/);
  assert.match(page, /localStorage\.setItem\("dropzone-items"/);
  assert.match(page, /Drop anything here/);
  assert.match(page, /Search your dropzone/);
  assert.match(layout, /Dropzone — Your private inbox/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(packageJson, /"deploy": "vinext deploy --name dropzone"/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
});
