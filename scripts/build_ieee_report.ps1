param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string[]]$Authors,
    [string]$OutputPath = "Final_Submission_Deliverables\01_Final_IEEE_Report\GroupApex_MediFind_PH_IEEE_Final_Report.docx",
    [switch]$ValidationOnly
)

$ErrorActionPreference = "Stop"
if ($Authors | Where-Object { [string]::IsNullOrWhiteSpace($_) -or $_ -match "pending|unknown|author" }) {
    throw "Every author must be supplied as an exact full name; placeholders are not allowed."
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function X([string]$Value) { [Security.SecurityElement]::Escape($Value) }
function Run([string]$Text, [switch]$Bold, [switch]$Italic, [int]$Size = 20) {
    $props = "<w:rFonts w:ascii=`"Times New Roman`" w:hAnsi=`"Times New Roman`"/><w:sz w:val=`"$Size`"/><w:szCs w:val=`"$Size`"/>"
    if ($Bold) { $props += "<w:b/>" }
    if ($Italic) { $props += "<w:i/>" }
    "<w:r><w:rPr>$props</w:rPr><w:t xml:space=`"preserve`">$(X $Text)</w:t></w:r>"
}
function Para([string]$Text, [string]$Align = "both", [int]$After = 80, [int]$FirstLine = 240, [switch]$Bold, [switch]$Italic, [int]$Size = 20) {
    $indent = if ($FirstLine -gt 0) { "<w:ind w:firstLine=`"$FirstLine`"/>" } else { "" }
    "<w:p><w:pPr><w:jc w:val=`"$Align`"/><w:spacing w:after=`"$After`" w:line=`"240`" w:lineRule=`"auto`"/>$indent</w:pPr>$(Run $Text -Bold:$Bold -Italic:$Italic -Size $Size)</w:p>"
}
function Heading([string]$Text, [int]$Level = 1) {
    $size = if ($Level -eq 1) { 20 } else { 19 }
    $align = if ($Level -eq 1) { "center" } else { "left" }
    Para $Text.ToUpperInvariant() $align 80 0 -Bold -Size $size
}
function Cell([string]$Text, [switch]$Header) {
    $shade = if ($Header) { "<w:shd w:fill=`"D9EAF7`"/>" } else { "" }
    "<w:tc><w:tcPr>$shade<w:tcMar><w:top w:w=`"40`" w:type=`"dxa`"/><w:left w:w=`"50`" w:type=`"dxa`"/><w:bottom w:w=`"40`" w:type=`"dxa`"/><w:right w:w=`"50`" w:type=`"dxa`"/></w:tcMar></w:tcPr>$(Para $Text 'left' 0 0 -Bold:$Header -Size 16)</w:tc>"
}
function Table([object[]]$Rows) {
    $xml = "<w:tbl><w:tblPr><w:tblW w:w=`"0`" w:type=`"auto`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:color=`"666666`"/><w:left w:val=`"single`" w:sz=`"4`" w:color=`"666666`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:color=`"666666`"/><w:right w:val=`"single`" w:sz=`"4`" w:color=`"666666`"/><w:insideH w:val=`"single`" w:sz=`"2`" w:color=`"AAAAAA`"/><w:insideV w:val=`"single`" w:sz=`"2`" w:color=`"AAAAAA`"/></w:tblBorders></w:tblPr>"
    for ($i = 0; $i -lt $Rows.Count; $i++) {
        $xml += "<w:tr>"
        foreach ($value in $Rows[$i]) { $xml += Cell ([string]$value) -Header:($i -eq 0) }
        $xml += "</w:tr>"
    }
    $xml + "</w:tbl><w:p/>"
}

$authorLine = $Authors -join ", "
$body = & {
Para "MediFind PH: A Retrieval-Augmented Generation Chatbot for Source-Grounded OTC Medicine Information in the Philippines" 'center' 120 0 -Bold -Size 28
Para $authorLine 'center' 40 0 -Size 21
Para "Group Apex — ITC-C508 Deep Learning (Natural Language Processing)" 'center' 140 0 -Italic -Size 18
Para "Abstract—This paper presents MediFind PH, a retrieval-augmented generation (RAG) chatbot that provides general, source-grounded information about over-the-counter medicines in the Philippines. The controlled knowledge base contains 94 medicine records from three official MediFind OTC PDF volumes. The implementation combines pharmaceutical entity normalization, MiniLM embeddings, ChromaDB retrieval, FLAN-T5 Base generation, deterministic record-level answers, page citations, and medical-safety gates. Five retrieval configurations were evaluated using actual execution outputs. Configuration D—800-character chunks, 200-character overlap, and top-k 3—was selected because it obtained the highest recorded answer quality (3/9) and MRR@3 (0.5926) among the tested settings. A separate 36-question live-API baseline evaluation produced 30 automated passes and 6 automated failures; stricter engineering review produced 19 passes, 14 partial passes, and 3 failures. The results show that fluent answers are not sufficient evidence of correctness: formulation matching, section extraction, completeness, and citation relevance must be evaluated independently. The system is an information-retrieval assistant and does not diagnose, prescribe, or provide personalized dosage advice." 'both' 100 0 -Size 18
Para "Index Terms—retrieval-augmented generation, OTC medicine, pharmaceutical entity normalization, ChromaDB, MiniLM, FLAN-T5, chatbot evaluation, medical information safety." 'both' 140 0 -Italic -Size 18

Heading "I. Introduction"
Para "Consumers frequently encounter the same medicine under different brand names, generic names, strengths, dosage forms, abbreviations, and spelling variations. This representational mismatch can prevent a retrieval system from locating the correct formulation even when the required fact exists in the knowledge base. MediFind PH addresses this information-access problem through a controlled RAG pipeline whose answers are grounded only in three project PDF volumes. The system is intentionally limited to general OTC product information; it is not a diagnostic, prescribing, or clinical decision-support tool."
Para "The main research question is: How effectively can MediFind PH use pharmaceutical entity normalization and RAG to retrieve accurate, relevant, complete, and source-grounded information when users express medicine questions using different names, strengths, dosage forms, and natural-language variations? The project evaluates both retrieval behavior and final response quality instead of treating linguistic fluency as correctness."

Heading "II. Knowledge Base and Scope"
Para "The factual reference consists exclusively of MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf, MediFind_OTC_Vol2_Cold-Cough-Allergy-Throat.pdf, and MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf. Together they contain 226 extracted PDF pages and 94 individual medicine records. The volumes cover pain, fever, muscle products; cold, cough, allergy, and throat products; and digestive, antiseptic, and eye products. Registration records provide brand, generic name, strength, dosage form, registration number, manufacturer, and pharmacologic category. Where available, official leaflet pages provide indications, warnings, precautions, adverse effects, dosage, contraindications, and storage information."
Para "No external medicine facts are used to fill missing fields. Missing information is reported as unavailable or insufficiently supported. Price, discount, and inventory requests are refused because the three PDFs do not provide reliable current commercial data. The same safety layer refuses diagnosis, prescribing, treatment selection, personalized dosage, and overdose requests."

Heading "III. System Architecture"
Heading "A. Document Processing and Indexing" 2
Para "The ingestion pipeline loads the three PDFs with PyPDFLoader, preserves file and page metadata, and splits text using RecursiveCharacterTextSplitter. Configuration D uses 800-character chunks with 200-character overlap and records each chunk's start index. Sentence-transformers/all-MiniLM-L6-v2 converts chunks to dense vectors. ChromaDB stores 762 production chunks in the medifind_otc collection. A manifest records the splitter, embedding model, source hashes, chunk count, and creation timestamp."
Heading "B. Entity Normalization and Formulation Matching" 2
Para "The query pipeline normalizes case, whitespace, units, registration numbers, brand aliases, generic names, active ingredients, strength quantities, and dosage forms. Exact matching is preferred; bounded fuzzy matching runs only when exact identity matching fails. Variant narrowing keeps strength and form details attached to the correct product line. Enumeration requests retain all matching records, while focused questions either select one verified formulation or request clarification."
Heading "C. Retrieval, Generation, and Citations" 2
Para "For each question, the system retrieves top-k 3 chunks, filters sibling-formulation conflicts, and combines retrieval with verified structured records and extracted leaflet sections. Deterministic answer builders handle registration fields, enumerations, comparisons, and source requests. FLAN-T5 Base is used for appropriate evidence-grounded generation fallbacks. Response guards reject untraceable quantities, foreign registration numbers, unsupported numerals, weakly grounded text, and non-substantive fragments. Citations include the PDF filename, one-based page number, and a verbatim indexed passage."
Heading "D. Application Layer" 2
Para "FastAPI exposes health, catalog, and chat endpoints. A React/Vite frontend renders conversations, uncertainty states, medicine cards, disclaimers, and source passages. The response contract contains answer, status, sources, medicine, and recognized entity fields. The status distinguishes supported answers, insufficient evidence, and unsupported medical or commercial requests."

Heading "IV. Experimental Method"
Para "Five completed configurations were compared using the same three PDFs and nine verified questions. Runs A through D held retrieval depth at top-k 3 and varied chunk size and overlap; Run E retained Run B's chunking and increased top-k to 5 as a sensitivity control. Each fresh run rebuilt its vector index and recorded chunk count, indexing time, average retrieval and total response latency, strict answer correctness, Precision@k, Recall@k, and MRR@k. The saved outputs were produced on Google Colab with an NVIDIA Tesla T4."
Table @(
    @("Run", "Chunk", "Overlap", "Top-k", "Chunks", "Index s", "Avg total s", "Correct/9", "P@k", "R@k", "MRR@k")
    @("A", "400", "50", "3", "1318", "3.32", "0.413", "2", "0.1852", "0.3889", "0.2963")
    @("B", "800", "100", "3", "687", "2.68", "0.569", "1", "0.2593", "0.6111", "0.4444")
    @("C", "1200", "150", "3", "484", "1.99", "0.438", "1", "0.2963", "0.5370", "0.4630")
    @("D", "800", "200", "3", "762", "5.78", "0.860", "3", "0.2593", "0.5370", "0.5926")
    @("E", "800", "100", "5", "687", "2.78", "0.548", "1", "0.2444", "0.6852", "0.4722")
)
Para "Configuration D was selected because it achieved the highest MRR@3 and highest strict answer-quality count. Although it was not the fastest configuration, its overlap better preserved context across boundaries. Run E improved Recall@k but did not improve answer correctness, demonstrating that retrieving more chunks can add distractors without improving generation. The selection therefore prioritizes rank quality and end-answer behavior over raw latency alone."

Heading "V. Execution Logs and Checkpoints"
Para "The executed notebook documents 226 loaded pages, the initial 800/120 smoke-test checkpoint with 703 chunks, MiniLM embedding generation, ChromaDB construction, FLAN-T5 Base loading, retrieval traces, RAG responses, GPU/CPU benchmarking, and an interactive nine-question chatbot session. The later production checkpoint is distinct: it implements Configuration D and contains 762 chunks. SHA-256 manifests identify the notebook, workbooks, source PDFs, Chroma metadata store, HNSW components, and final configuration. Recorded GPU speedups across the benchmark configurations ranged from 6.00× to 7.08× for total response time, 6.07× to 7.21× for generation, and 22.07× to 30.56× for indexing."

Heading "VI. Chatbot Response Evaluation"
Para "A reproducible live-API suite executed 36 questions spanning all three PDF volumes. It included medicine identification, brand and generic searches, ingredients, formulation comparisons, multi-formulation listings, leaflet indications, warnings, missing information, unknown medicines, unsupported medical requests, citation accuracy, and a cross-volume comparison. Expected answers were derived from the PDFs rather than from chatbot output. Each case was assessed for relevance, factual accuracy, completeness, formulation matching, citation accuracy, and medical safety."
Table @(
    @("Review layer", "PASS", "PARTIAL", "FAIL", "Pass rate")
    @("Automated API checks", "30", "0", "6", "83.3%")
    @("Strict engineer review", "19", "14", "3", "52.8%")
    @("Strict pass + partial", "33", "—", "3", "91.7%")
)
Para "All six explicit safety-gate cases passed: unknown antibiotic information, diagnosis, personalized dosage, price or inventory, treatment recommendation, and discount requests were handled without fabricated clinical or commercial claims. The strict review downgraded otherwise correct responses when citations included unrelated leaflet pages. The three strict failures were an omitted Bonamine 12.5 mg formulation, incomplete Canesten warning extraction, and cross-formulation contamination in a Dolfenal versus Gaviscon comparison."

Heading "VII. Error Analysis and System Improvements"
Para "The evaluation identified five reusable root causes. First, decimal strengths were damaged by punctuation-removing normalization during quantity matching. Second, quantities from one comparison entity could select a sibling formulation of another entity. Third, leaflet heading rules could merge a warnings section with a later physician-consultation or manufacturer section. Fourth, multi-record templates did not always return every field requested by the user. Fifth, citation assembly appended all leaflet pages regardless of question intent."
Para "Systemic corrections were implemented in the matching and answer pipeline: quantity parsing now uses raw strength-bearing fields; comparison narrowing is scoped by product line; warnings and consultation headings are separated; multi-record answers include requested manufacturers and categories; side-effect lists receive guarded deterministic extraction; source descriptions distinguish registration pages from supporting leaflet evidence; and citations are scoped to registration fields, requested leaflet sections, or explicit source requests. Regression tests were added for Bonamine decimal strengths, Dolfenal/Gaviscon cross-product contamination, Canesten warning boundaries, Dolfenal adverse-effect completeness, and field-level citation precision. These changes are implementation evidence, not a claimed post-fix pass rate; a new live run is required before reporting updated metrics."

Heading "VIII. Reproducibility"
Para "The submission includes a Configuration D reproducibility notebook, the complete FastAPI and React source code, dependency manifests, all three PDFs, the production Chroma manifest, test scripts, the original executed experiment notebook, result workbooks, raw execution logs, checkpoint hashes, the 36-case evaluation runner, raw API responses, automated scoring, engineer adjudication, CSV and Excel views, and a package-wide SHA-256 manifest. Generated environments such as .venv and node_modules are intentionally excluded and are recreated from requirements.txt and package-lock.json."

Heading "IX. Limitations and Threats to Validity"
Para "The knowledge base is limited to 94 records in three project PDFs and does not represent all OTC products available in the Philippines. OCR transcription can interleave columns or contain character errors. The nine-question chunking set is small, and strict answer accuracy is sensitive to the selected questions and scoring criteria. FLAN-T5 Base is resource-efficient but can produce short or incomplete answers. Automated checks cannot prove that all 94 records are correct. The 36-case evaluation is broader but remains a sample, and the researchers' final Phase 5 manual testing is not marked complete. Current prices, discounts, pharmacy inventory, diagnoses, treatment selection, and personalized dosing remain outside system scope."

Heading "X. Conclusion"
Para "MediFind PH demonstrates a reproducible RAG architecture for controlled OTC medicine information. Configuration D provided the best recorded rank quality and answer score among the tested settings, while the live evaluation showed that answer correctness depends on more than fluent generation. Record identity, formulation binding, leaflet section boundaries, field completeness, safety behavior, and statement-level citation support must all be verified. The preserved experiment evidence and explicit limitations allow future evaluations to measure improvements without rewriting or overstating the original results."

Heading "References"
$refs = @(
    "[1] Group Apex, MediFind_OTC_Vol1_Pain-Fever-Muscle.pdf, project knowledge-base volume 1, 2026.",
    "[2] Group Apex, MediFind_OTC_Vol2_Cold-Cough-Allergy-Throat.pdf, project knowledge-base volume 2, 2026.",
    "[3] Group Apex, MediFind_OTC_Vol3_Digestive-Antiseptic-Eye.pdf, project knowledge-base volume 3, 2026.",
    "[4] P. Lewis et al., 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,' Advances in Neural Information Processing Systems, vol. 33, 2020.",
    "[5] W. Wang et al., 'MiniLM: Deep Self-Attention Distillation for Task-Agnostic Compression of Pre-Trained Transformers,' Advances in Neural Information Processing Systems, vol. 33, 2020.",
    "[6] H. W. Chung et al., 'Scaling Instruction-Finetuned Language Models,' Journal of Machine Learning Research, vol. 25, 2024.",
    "[7] Chroma, 'Chroma Documentation,' https://docs.trychroma.com/.",
    "[8] MediFind PH, GroupApex Chunking Experiments, Execution Logs and Checkpoints, and Chatbot Response Evaluation deliverables, 2026."
)
foreach ($ref in $refs) { $body += Para $ref 'left' 40 0 -Size 16 }

}
$body = $body -join ""

$document = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    $body
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
      <w:cols w:num="2" w:space="360"/>
      <w:docGrid w:linePitch="240"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$styles = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>
"@
$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"@
$rootRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"@
$docRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"@
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$core = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MediFind PH IEEE Final Report</dc:title><dc:creator>$(X $authorLine)</dc:creator><dc:subject>RAG chatbot experiments and evaluation</dc:subject><dc:description>Final IEEE-format project report with actual experiment results.</dc:description><cp:lastModifiedBy>Group Apex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">$now</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">$now</dcterms:modified>
</cp:coreProperties>
"@
$app = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MediFind PH Reproducibility Builder</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>Group Apex</Company><AppVersion>1.0</AppVersion></Properties>
"@

$resolved = [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$workspace = [IO.Path]::GetFullPath((Get-Location).Path)
if (-not $resolved.StartsWith($workspace, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Output must stay inside the workspace: $resolved"
}
[IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($resolved)) | Out-Null
$stream = [IO.File]::Open($resolved, [IO.FileMode]::Create, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
try {
    $zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
    try {
        $parts = @{
            "[Content_Types].xml" = $contentTypes; "_rels/.rels" = $rootRels;
            "word/document.xml" = $document; "word/styles.xml" = $styles;
            "word/_rels/document.xml.rels" = $docRels; "docProps/core.xml" = $core;
            "docProps/app.xml" = $app
        }
        foreach ($name in $parts.Keys) {
            $entry = $zip.CreateEntry($name, [IO.Compression.CompressionLevel]::Optimal)
            $writer = [IO.StreamWriter]::new($entry.Open(), [Text.UTF8Encoding]::new($false))
            try { $writer.Write($parts[$name]) } finally { $writer.Dispose() }
        }
    } finally { $zip.Dispose() }
} finally { $stream.Dispose() }

Write-Output "Created $resolved"
Write-Output "Authors: $authorLine"

$submissionRoot = Join-Path $workspace "Final_Submission_Deliverables"
if (-not $ValidationOnly) {
$pending = Join-Path $submissionRoot "01_Final_IEEE_Report\AUTHOR_NAMES_REQUIRED.txt"
if (Test-Path -LiteralPath $pending) { [IO.File]::Delete($pending) }

$matrixPath = Join-Path $submissionRoot "DELIVERABLE_VERIFICATION_MATRIX.csv"
if (Test-Path -LiteralPath $matrixPath) {
    $matrix = Import-Csv -LiteralPath $matrixPath
    foreach ($row in $matrix) {
        if ($row.'No.' -eq '1') {
            $row.'Included evidence' = "IEEE-format final report; all supplied authors listed: $authorLine"
            $row.Status = "COMPLETE"
        }
    }
    $matrix | Export-Csv -LiteralPath $matrixPath -NoTypeInformation -Encoding UTF8
}

$readmePath = Join-Path $submissionRoot "README.md"
if (Test-Path -LiteralPath $readmePath) {
    $readme = Get-Content -Raw -LiteralPath $readmePath
    $readme = $readme -replace 'Deliverable 1 remains pending only because the repository does not contain the authoritative full author list\.', 'All five required deliverables are present; the IEEE report lists the authoritative author names supplied by the researchers.'
    [IO.File]::WriteAllText($readmePath, $readme, [Text.UTF8Encoding]::new($false))
}

$checksumPath = Join-Path $submissionRoot "SHA256SUMS.txt"
$lines = Get-ChildItem -LiteralPath $submissionRoot -Recurse -File |
    Where-Object { $_.FullName -ne $checksumPath } |
    Sort-Object FullName |
    ForEach-Object {
        $relative = $_.FullName.Substring($submissionRoot.Length + 1).Replace('\', '/')
        "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash, $relative
    }
[IO.File]::WriteAllText($checksumPath, (($lines -join "`r`n") + "`r`n"), [Text.UTF8Encoding]::new($false))
}
