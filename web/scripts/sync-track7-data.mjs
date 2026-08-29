import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceDir = path.resolve(__dirname, "../../data/processed");
const targetDir = path.resolve(__dirname, "../src/data/track7");

const COMPACT_FILES = [
  "phoenix_tract_risk.json",
  "correlation_summary.json",
  "sensitivity_summary.json",
  "track7_summary.json",
];

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

let copiedCount = 0;
for (const fileName of COMPACT_FILES) {
  const srcPath = path.join(sourceDir, fileName);
  const dstPath = path.join(targetDir, fileName);

  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, dstPath);
    console.log(`[sync-track7-data] Copied ${fileName} -> web/src/data/track7/`);
    copiedCount++;
  } else {
    console.warn(`[sync-track7-data] Warning: Source file missing ${srcPath}`);
  }
}

console.log(`[sync-track7-data] Sync complete (${copiedCount}/${COMPACT_FILES.length} files synced).`);
