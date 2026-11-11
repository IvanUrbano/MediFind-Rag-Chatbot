import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve("Final_Submission_Deliverables");
if (!fs.existsSync(root)) throw new Error(`Missing submission folder: ${root}`);

const generatedDirectories = new Set([".venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache", ".git"]);
const chromaPrefix = "03_Source_Code_and_Reproducibility/data/chroma_db/";
const isGeneratedChromaFile = (file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  return relative.startsWith(chromaPrefix) && !relative.endsWith("/manifest.json");
};

function filesUnder(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    if (entry.isDirectory() && generatedDirectories.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (isGeneratedChromaFile(full)) return [];
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

const output = path.join(root, "SHA256SUMS.txt");
const lines = filesUnder(root)
  .filter((file) => path.resolve(file) !== output)
  .sort()
  .map((file) => {
    const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").toUpperCase();
    return `${hash}  ${path.relative(root, file).replaceAll("\\", "/")}`;
  });
fs.writeFileSync(output, `${lines.join("\r\n")}\r\n`);
console.log(`Checksummed ${lines.length} files.`);
