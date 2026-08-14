const { mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const outputDirectory = join(__dirname, "..", "dist-cjs");

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(join(outputDirectory, "package.json"), `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`);
