import fs from "node:fs";
import zlib from "node:zlib";

const input = process.argv[2];
if (!input) throw new Error("Usage: node extract_reportlab_pdf_text.mjs <pdf>");

function ascii85(text) {
  const clean = text.replace(/\s+/g, "").replace(/^<~/, "").replace(/~>$/, "");
  const out = [];
  let group = [];
  for (const char of clean) {
    if (char === "z" && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const value = char.charCodeAt(0) - 33;
    if (value < 0 || value > 84) continue;
    group.push(value);
    if (group.length === 5) {
      let number = 0;
      for (const digit of group) number = number * 85 + digit;
      out.push((number >>> 24) & 255, (number >>> 16) & 255, (number >>> 8) & 255, number & 255);
      group = [];
    }
  }
  if (group.length) {
    const useful = group.length - 1;
    while (group.length < 5) group.push(84);
    let number = 0;
    for (const digit of group) number = number * 85 + digit;
    const bytes = [(number >>> 24) & 255, (number >>> 16) & 255, (number >>> 8) & 255, number & 255];
    out.push(...bytes.slice(0, useful));
  }
  return Buffer.from(out);
}

function unescapePdf(value) {
  return value
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([()\\])/g, "$1");
}

const raw = fs.readFileSync(input).toString("latin1");
const streams = [...raw.matchAll(/\/ASCII85Decode\s+\/FlateDecode[^]*?stream\r?\n([^]*?)endstream/g)];
for (const [index, match] of streams.entries()) {
  const decoded = zlib.inflateSync(ascii85(match[1])).toString("latin1");
  const lines = [];
  for (const textMatch of decoded.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    lines.push(unescapePdf(textMatch[1]));
  }
  process.stdout.write(`\n--- PAGE ${index + 1} ---\n${lines.join("\n")}\n`);
}
