import { $ } from "bun";

console.log("🔨 Building restate-for-dummies...");

// Clean dist directory
console.log("🧹 Cleaning dist directory...");
await $`rm -rf dist`;

// Build TypeScript declarations
console.log("📝 Building TypeScript declarations...");
await $`bunx tsc -p tsconfig.build.json`;

// Build with Bun
console.log("📦 Building with Bun...");
const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  sourcemap: "external",
  external: ["@restatedev/restate-sdk", "@restatedev/restate-sdk-clients"],
  splitting: true,
  minify: false, // Don't minify library code
});

if (!result.success) {
  console.error("❌ Build failed!");
  for (const message of result.logs) {
    console.error(message);
  }
  process.exit(1);
}

// Copy package.json fields for publishing
console.log("📋 Preparing package metadata...");
const pkg = await Bun.file("package.json").json();
const distPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  type: pkg.type,
  main: "./index.js",
  module: "./index.js",
  types: "./index.d.ts",
  exports: {
    ".": {
      types: "./index.d.ts",
      import: "./index.js",
    },
  },
  dependencies: pkg.dependencies,
  peerDependencies: pkg.peerDependencies,
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license,
  repository: pkg.repository,
  bugs: pkg.bugs,
  homepage: pkg.homepage,
};

await Bun.write("dist/package.json", JSON.stringify(distPkg, null, 2));

// Copy README if it exists
const readmeExists = await Bun.file("README.md").exists();
if (readmeExists) {
  console.log("📄 Copying README.md...");
  await $`cp README.md dist/`;
}

console.log("✅ Build complete!");
console.log("📁 Output directory: ./dist");

// List output files
console.log("\n📦 Built files:");
const files = await $`ls -la dist/`.text();
console.log(files);
