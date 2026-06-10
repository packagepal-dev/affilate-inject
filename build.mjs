import * as esbuild from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const outdir = "dist";
const watch = process.argv.includes("--watch");

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

// ESM bundles: service worker (manifest background.type=module) and the
// popup/options pages (loaded via <script type="module">).
const esmConfig = {
  entryPoints: {
    "service-worker": "src/background/service-worker.ts",
    popup: "src/popup/popup.ts",
    options: "src/options/options.ts",
  },
  outdir,
  bundle: true,
  format: "esm",
  target: "chrome114",
  sourcemap: true,
  logLevel: "info",
};

// Content scripts run as classic scripts, so they must be a self-contained IIFE.
const contentConfig = {
  entryPoints: { content: "src/content/content.ts" },
  outdir,
  bundle: true,
  format: "iife",
  target: "chrome114",
  sourcemap: true,
  logLevel: "info",
};

async function copyStatic() {
  await cp("manifest.json", `${outdir}/manifest.json`);
  await cp("src/popup/popup.html", `${outdir}/popup.html`);
  await cp("src/options/options.html", `${outdir}/options.html`);
}

if (watch) {
  const a = await esbuild.context(esmConfig);
  const b = await esbuild.context(contentConfig);
  await a.watch();
  await b.watch();
  await copyStatic();
  console.log("watching… (static files copied once; re-run build to refresh html/manifest)");
} else {
  await esbuild.build(esmConfig);
  await esbuild.build(contentConfig);
  await copyStatic();
  console.log("build complete -> dist/");
}
