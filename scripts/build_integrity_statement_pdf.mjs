import fs from "node:fs";
import path from "node:path";

const output = path.resolve(
  "Final_Submission_Deliverables/06_Integrity_and_AI_Usage_Statement/GroupApex_Final_Project_Integrity_and_AI_Usage_Statement.pdf",
);
fs.mkdirSync(path.dirname(output), {recursive: true});

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 54;
const RIGHT = 54;
const TOP = 52;
const BOTTOM = 48;
const pages = [];

function escapePdf(text) {
  return String(text).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrap(text, size = 10, indent = 0) {
  const usable = PAGE_W - LEFT - RIGHT - indent;
  const maxChars = Math.max(20, Math.floor(usable / (size * 0.51)));
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxChars) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makePage(pageNumber, title) {
  let y = PAGE_H - TOP;
  const commands = [];
  function line(text, {size = 10, bold = false, align = "left", indent = 0, before = 0, after = 3, leading = size * 1.28} = {}) {
    y -= before;
    const lines = wrap(text, size, indent);
    for (const value of lines) {
      let x = LEFT + indent;
      if (align === "center") x = Math.max(LEFT, (PAGE_W - value.length * size * 0.49) / 2);
      commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm (${escapePdf(value)}) Tj ET`);
      y -= leading;
    }
    y -= after;
  }
  function rule(before = 2, after = 8) {
    y -= before;
    commands.push(`0.55 w ${LEFT} ${y.toFixed(1)} m ${PAGE_W - RIGHT} ${y.toFixed(1)} l S`);
    y -= after;
  }
  function blank(count = 1, spacing = 13) { y -= count * spacing; }

  line(title, {size: 15, bold: true, align: "center", after: 2});
  line("MEDIFIND PH - GROUP APEX", {size: 11, bold: true, align: "center", after: 8});
  rule(0, 12);

  return {commands, line, rule, blank, getY: () => y, pageNumber};
}

const p1 = makePage(1, "FINAL PROJECT INTEGRITY AND AI USAGE STATEMENT");
p1.line("Project Title: MediFind PH: A RAG-Based OTC Medicine Information Assistant Using Pharmaceutical Entity Normalization", {bold: true, after: 2});
p1.line("Course/Section: ITC-C508 - Deep Learning (Natural Language Processing)", {after: 2});
p1.line("Authors: Mendez, Juliana Nichole; Subala, Antonio Jayven; Urbano, Ivan", {after: 2});
p1.line("Group: Group Apex", {after: 8});
p1.line("Submission Date: ____________________________________", {after: 10});

p1.line("PURPOSE OF THIS STATEMENT", {bold: true, size: 11, after: 4});
p1.line("This document records the authors' declaration regarding the authenticity of the submitted work, the accuracy of the reported experiment results, the contribution of each group member, and the transparent use of generative artificial intelligence tools. It must be reviewed and signed personally by every listed author before submission.", {after: 9});

p1.line("1. ACADEMIC INTEGRITY AND AUTHENTICITY DECLARATION", {bold: true, size: 11, after: 5});
for (const statement of [
  "We declare that MediFind PH is the work of the students named in this statement, except for sources, software libraries, public models, and AI assistance that are explicitly acknowledged.",
  "We did not knowingly submit another person's project as our own, falsify authorship, fabricate source documents, or represent unexecuted experiments as completed experiments.",
  "The three MediFind OTC PDF volumes are the project's controlled factual references. Medicine facts, expected evaluation answers, and citations must be traceable to those documents.",
  "All external materials, frameworks, pretrained models, libraries, and references used in the project are acknowledged in the report, source package, or reproducibility documentation.",
  "Each author accepts responsibility for reviewing the final submission and for correcting any error discovered before submission.",
]) p1.line(`[ ] ${statement}`, {indent: 10, after: 5});

p1.line("2. ACCURACY OF REPORTED RESULTS", {bold: true, size: 11, before: 4, after: 5});
for (const statement of [
  "The chunking tables and notebook outputs preserve the recorded experiment results for Configurations A through E.",
  "Configuration D remains 800-character chunks, 200-character overlap, and top-k 3; the production checkpoint contains 762 chunks.",
  "The chatbot response evaluation preserves an actual 36-question baseline API run. Baseline results are not relabeled as post-fix results.",
  "Limitations, failed cases, partial passes, OCR constraints, and the fact that final Phase 5 manual testing remains the researchers' responsibility are disclosed rather than hidden.",
]) p1.line(`[ ] ${statement}`, {indent: 10, after: 5});

pages.push(p1);

const p2 = makePage(2, "FINAL PROJECT INTEGRITY AND AI USAGE STATEMENT");
p2.line("3. GENERATIVE AI USAGE DISCLOSURE", {bold: true, size: 11, after: 5});
p2.line("Generative AI assistance was used in this project and is disclosed here. The authors must not sign a statement claiming that no generative AI was used. The use of AI does not transfer academic responsibility away from the students.", {bold: true, after: 8});
p2.line("Tool/Service: OpenAI ChatGPT/Codex (AI-assisted coding, analysis, documentation, and artifact-generation environment).", {after: 6});
p2.line("Disclosed purposes:", {bold: true, after: 3});
for (const use of [
  "Reviewing and explaining RAG implementation behavior, retrieval errors, formulation matching, leaflet-section extraction, citation scoping, and medical-safety controls.",
  "Assisting with code changes, regression-test scaffolding, evaluation scripts, and reproducibility instructions under student direction.",
  "Organizing deliverable folders and drafting or formatting reports, notebooks, spreadsheets, CSV files, manifests, checksums, and this signature-ready statement.",
  "Helping analyze actual saved experiment outputs and actual live-API evaluation results; AI assistance was not treated as a factual medicine source.",
]) p2.line(`- ${use}`, {indent: 12, after: 5});

p2.line("Controls and student responsibilities:", {bold: true, before: 3, after: 3});
for (const control of [
  "The three official project PDFs remain the only factual reference for medicine answers and expected evaluation answers.",
  "Original experiment outputs and baseline metrics are preserved. No result should be called executed unless corresponding execution evidence exists.",
  "The students are responsible for reading, testing, correcting, and approving all AI-assisted code and text before submission.",
  "AI did not sign this document, determine individual grades, or certify the truth of any student's declaration.",
  "If the institution or instructor requires a different disclosure format or restricts generative AI use, the authors must obtain guidance before signing.",
]) p2.line(`[ ] ${control}`, {indent: 10, after: 5});

pages.push(p2);

const p3 = makePage(3, "FINAL PROJECT INTEGRITY AND AI USAGE STATEMENT");
p3.line("4. INDIVIDUAL CONTRIBUTION RECORD", {bold: true, size: 11, after: 4});
p3.line("Each student must personally describe specific contributions. Do not leave this section blank and do not copy identical descriptions unless the work was genuinely shared.", {after: 10});
for (const name of ["Mendez, Juliana Nichole", "Subala, Antonio Jayven", "Urbano, Ivan"]) {
  p3.line(`Student: ${name}`, {bold: true, after: 5});
  p3.line("Specific contributions: __________________________________________________________________________", {after: 3});
  p3.line("________________________________________________________________________________________________", {after: 3});
  p3.line("________________________________________________________________________________________________", {after: 3});
  p3.line("________________________________________________________________________________________________", {after: 16});
}
p3.line("Contribution review initials:", {bold: true, before: 6, after: 8});
p3.line("Mendez: __________    Subala: __________    Urbano: __________", {after: 4});
pages.push(p3);

const p4 = makePage(4, "FINAL PROJECT INTEGRITY AND AI USAGE STATEMENT");
p4.line("5. FINAL DECLARATION", {bold: true, size: 11, after: 5});
p4.line("By signing below, each student confirms that they have read the complete final submission, that their contribution description is accurate, that the reported results are presented honestly to the best of their knowledge, and that the generative AI disclosure above is complete. Each signer understands that false statements, fabricated evidence, undisclosed AI use, or misrepresented contributions may be handled under the institution's academic integrity rules.", {after: 12});

p4.line("STUDENT SIGNATURES", {bold: true, size: 11, after: 8});
for (const name of ["Mendez, Juliana Nichole", "Subala, Antonio Jayven", "Urbano, Ivan"]) {
  p4.line(`Printed Name: ${name}`, {bold: true, after: 5});
  p4.line("Signature: __________________________________________    Date: __________________________", {after: 14});
}

p4.line("OPTIONAL ADVISER/INSTRUCTOR ACKNOWLEDGMENT", {bold: true, size: 11, before: 8, after: 5});
p4.line("Name: ______________________________________________", {after: 5});
p4.line("Signature: __________________________________________    Date: __________________________", {after: 15});

p4.line("PRE-SUBMISSION CHECKLIST", {bold: true, size: 11, after: 5});
for (const item of [
  "All three contribution descriptions are completed.",
  "All three students reviewed the AI usage disclosure.",
  "All three students signed and dated the statement personally.",
  "The signed PDF is included in the final submission folder.",
  "No unsigned or draft version is submitted as the signed final statement.",
]) p4.line(`[ ] ${item}`, {indent: 10, after: 5});

p4.line("Document status: SIGNATURE-READY TEMPLATE - NOT VALID UNTIL COMPLETED AND SIGNED BY ALL AUTHORS", {bold: true, align: "center", before: 14, after: 2, size: 9});
pages.push(p4);

for (const page of pages) {
  if (page.getY() < BOTTOM + 20) {
    throw new Error(`Page ${page.pageNumber} content overflowed the signature-safe margin (y=${page.getY()}).`);
  }
}

// Add page footers.
for (const page of pages) {
  page.commands.push(`BT /F1 8 Tf 1 0 0 1 54 24 Tm (MediFind PH - Group Apex) Tj ET`);
  page.commands.push(`BT /F1 8 Tf 1 0 0 1 500 24 Tm (Page ${page.pageNumber} of ${pages.length}) Tj ET`);
}

const objects = [];
const addObject = (body) => { objects.push(body); return objects.length; };
const catalogId = addObject("");
const pagesId = addObject("");
const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const pageIds = [];

for (const page of pages) {
  const stream = page.commands.join("\n") + "\n";
  const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`);
  const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
  pageIds.push(pageId);
}

objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

let pdf = "%PDF-1.4\n%MediFindPH\n";
const offsets = [0];
for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

fs.writeFileSync(output, Buffer.from(pdf, "latin1"));
console.log(`Created ${output}`);
console.log(`Pages: ${pages.length}`);
console.log(`Lowest content positions: ${pages.map((page) => `p${page.pageNumber}=${page.getY().toFixed(1)}`).join(", ")}`);
