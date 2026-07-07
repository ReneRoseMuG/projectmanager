export type RichTextExportFormat = "docx" | "pdf" | "markdown";

interface RichTextExportInput {
  html: string;
  format: RichTextExportFormat;
  title?: string | null;
}

interface TextBlock {
  kind: "title" | "heading" | "paragraph" | "list" | "quote" | "code";
  text: string;
  level?: number;
}

const DEFAULT_EXPORT_TITLE = "Editor-Inhalt";
const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME_TYPE = "application/pdf";
const MARKDOWN_MIME_TYPE = "text/markdown;charset=utf-8";

export function exportRichTextDocument(input: RichTextExportInput): string {
  const title = normalizeTitle(input.title);
  const fileName = `${safeFileName(title)}.${input.format === "markdown" ? "md" : input.format}`;
  const blob = createRichTextExportBlob(input.html, title, input.format);
  downloadBlob(blob, fileName);
  return fileName;
}

export function createRichTextExportBlob(html: string, title: string, format: RichTextExportFormat): Blob {
  if (format === "markdown") {
    return new Blob([richTextHtmlToMarkdown(html, title)], { type: MARKDOWN_MIME_TYPE });
  }

  if (format === "docx") {
    return createDocxBlob(html, title);
  }

  return createPdfBlob(html, title);
}

export function richTextHtmlToMarkdown(html: string, title: string): string {
  const doc = parseHtml(html);
  const lines = [`# ${escapeMarkdown(normalizeTitle(title))}`, ""];

  for (const child of Array.from(doc.body.childNodes)) {
    const block = nodeToMarkdownBlock(child, 0).trim();
    if (block) {
      lines.push(block, "");
    }
  }

  return normalizeMarkdown(lines.join("\n"));
}

function normalizeTitle(value: string | null | undefined): string {
  const title = value?.trim();
  return title || DEFAULT_EXPORT_TITLE;
}

function parseHtml(html: string): Document {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(html || "", "text/html");
  }

  const doc = document.implementation.createHTMLDocument("");
  doc.body.innerHTML = html || "";
  return doc;
}

function safeFileName(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/[ .]+$/, "");
  return cleaned || DEFAULT_EXPORT_TITLE;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function inlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdown(node.textContent ?? "");
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(inlineMarkdown).join("");
  }

  const children = Array.from(node.childNodes).map(inlineMarkdown).join("");
  const tagName = node.tagName.toLowerCase();

  if (tagName === "strong" || tagName === "b") {
    return children ? `**${children}**` : "";
  }
  if (tagName === "em" || tagName === "i") {
    return children ? `*${children}*` : "";
  }
  if (tagName === "code") {
    return `\`${(node.textContent ?? "").replace(/`/g, "\\`")}\``;
  }
  if (tagName === "a") {
    const href = node.getAttribute("href")?.trim();
    return href && children ? `[${children}](${href})` : children;
  }
  if (tagName === "img") {
    const alt = node.getAttribute("alt") ?? "";
    const src = node.getAttribute("src") ?? "";
    return src ? `![${escapeMarkdown(alt)}](${src})` : "";
  }
  if (tagName === "br") {
    return "  \n";
  }

  return children;
}

function nodeToMarkdownBlock(node: Node, depth: number): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return normalizeWhitespace(inlineMarkdown(node));
  }

  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map((child) => nodeToMarkdownBlock(child, depth)).filter(Boolean).join("\n\n");
  }

  const tagName = node.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName)) {
    const level = Number(tagName.slice(1));
    return `${"#".repeat(level)} ${normalizeWhitespace(inlineMarkdown(node))}`;
  }
  if (tagName === "p") {
    return normalizeWhitespace(inlineMarkdown(node));
  }
  if (tagName === "blockquote") {
    return nodeToMarkdownBlockChildren(node, depth)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
  if (tagName === "pre") {
    return `\`\`\`\n${node.textContent?.trim() ?? ""}\n\`\`\``;
  }
  if (tagName === "ul" || tagName === "ol") {
    return listToMarkdown(node, tagName === "ol", depth);
  }
  if (tagName === "li") {
    return normalizeWhitespace(inlineMarkdown(node));
  }
  if (tagName === "hr") {
    return "---";
  }
  if (tagName === "table") {
    return tableToMarkdown(node);
  }

  return nodeToMarkdownBlockChildren(node, depth);
}

function nodeToMarkdownBlockChildren(node: Node, depth: number): string {
  return Array.from(node.childNodes)
    .map((child) => nodeToMarkdownBlock(child, depth))
    .filter(Boolean)
    .join("\n\n");
}

function listToMarkdown(list: HTMLElement, ordered: boolean, depth: number): string {
  const items = Array.from(list.children).filter((child) => child.tagName.toLowerCase() === "li");
  return items
    .map((item, index) => {
      const nestedLists = Array.from(item.children).filter((child) => ["ul", "ol"].includes(child.tagName.toLowerCase()));
      const itemClone = item.cloneNode(true) as HTMLElement;
      for (const nestedList of Array.from(itemClone.children).filter((child) => ["ul", "ol"].includes(child.tagName.toLowerCase()))) {
        nestedList.remove();
      }
      const prefix = ordered ? `${index + 1}. ` : "- ";
      const indent = "  ".repeat(depth);
      const text = normalizeWhitespace(inlineMarkdown(itemClone));
      const nested = nestedLists.map((nestedList) => nodeToMarkdownBlock(nestedList, depth + 1)).filter(Boolean).join("\n");
      return `${indent}${prefix}${text}${nested ? `\n${nested}` : ""}`;
    })
    .join("\n");
}

function tableToMarkdown(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeWhitespace(cell.textContent ?? ""))
  );
  if (rows.length === 0) {
    return "";
  }

  const [header, ...body] = rows;
  if (!header) {
    return "";
  }
  const separator = header.map(() => "---");
  return [header, separator, ...body]
    .map((row) => `| ${row.map((cell) => escapeMarkdown(cell)).join(" | ")} |`)
    .join("\n");
}

function normalizeMarkdown(value: string): string {
  return `${value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

function extractTextBlocks(html: string, title: string): TextBlock[] {
  const doc = parseHtml(html);
  const blocks: TextBlock[] = [{ kind: "title", text: normalizeTitle(title) }];

  for (const child of Array.from(doc.body.childNodes)) {
    appendTextBlocks(child, blocks);
  }

  return blocks.filter((block) => block.text.length > 0);
}

function appendTextBlocks(node: Node, blocks: TextBlock[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeWhitespace(node.textContent ?? "");
    if (text) {
      blocks.push({ kind: "paragraph", text });
    }
    return;
  }

  if (!(node instanceof HTMLElement)) {
    for (const child of Array.from(node.childNodes)) {
      appendTextBlocks(child, blocks);
    }
    return;
  }

  const tagName = node.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName)) {
    blocks.push({ kind: "heading", level: Number(tagName.slice(1)), text: normalizeWhitespace(node.textContent ?? "") });
    return;
  }
  if (tagName === "p" || tagName === "div") {
    const text = normalizeWhitespace(node.textContent ?? "");
    if (text) {
      blocks.push({ kind: "paragraph", text });
    }
    return;
  }
  if (tagName === "ul" || tagName === "ol") {
    Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .forEach((child, index) => {
        const prefix = tagName === "ol" ? `${index + 1}. ` : "- ";
        blocks.push({ kind: "list", text: `${prefix}${normalizeWhitespace(child.textContent ?? "")}` });
      });
    return;
  }
  if (tagName === "blockquote") {
    blocks.push({ kind: "quote", text: normalizeWhitespace(node.textContent ?? "") });
    return;
  }
  if (tagName === "pre" || tagName === "code") {
    blocks.push({ kind: "code", text: node.textContent?.trim() ?? "" });
    return;
  }
  if (tagName === "table") {
    Array.from(node.querySelectorAll("tr")).forEach((row) => {
      const text = Array.from(row.querySelectorAll("th,td")).map((cell) => normalizeWhitespace(cell.textContent ?? "")).join(" | ");
      if (text) {
        blocks.push({ kind: "paragraph", text });
      }
    });
    return;
  }

  for (const child of Array.from(node.childNodes)) {
    appendTextBlocks(child, blocks);
  }
}

function createDocxBlob(html: string, title: string): Blob {
  const blocks = extractTextBlocks(html, title);
  const documentXml = buildDocumentXml(blocks);
  return createZipBlob([
    { name: "[Content_Types].xml", data: contentTypesXml() },
    { name: "_rels/.rels", data: rootRelsXml() },
    { name: "word/document.xml", data: documentXml }
  ], WORD_MIME_TYPE);
}

function buildDocumentXml(blocks: TextBlock[]): string {
  const paragraphs = blocks.map(blockToWordParagraph).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function blockToWordParagraph(block: TextBlock): string {
  const size = block.kind === "title" ? 32 : block.kind === "heading" ? Math.max(22, 30 - ((block.level ?? 1) - 1) * 2) : 22;
  const bold = block.kind === "title" || block.kind === "heading";
  const italic = block.kind === "quote";
  const text = block.kind === "code" ? block.text : block.text;
  return `<w:p>
      <w:pPr><w:spacing w:after="${block.kind === "title" ? 260 : 140}"/></w:pPr>
      <w:r>
        <w:rPr>${bold ? "<w:b/>" : ""}${italic ? "<w:i/>" : ""}<w:sz w:val="${size}"/></w:rPr>
        <w:t xml:space="preserve">${escapeXml(text)}</w:t>
      </w:r>
    </w:p>`;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function createPdfBlob(html: string, title: string): Blob {
  const blocks = extractTextBlocks(html, title);
  const lines = blocks.flatMap((block) => wrapPdfLine(block.text, block.kind === "title" ? 58 : 86).concat(""));
  const pages = paginate(lines.length > 0 ? lines : [normalizeTitle(title)]);
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const fontObjectId = 3;

  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1] = "";
  objects[2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  for (const pageLines of pages) {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    const stream = buildPdfContentStream(pageLines);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  return new Blob([bytesToArrayBuffer(encodeAscii(buildPdf(objects)))], { type: PDF_MIME_TYPE });
}

function wrapPdfLine(text: string, maxChars: number): string[] {
  const words = normalizeWhitespace(text).split(" ").filter(Boolean);
  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function paginate(lines: string[]): string[][] {
  const pageSize = 48;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }
  return pages.length > 0 ? pages : [[""]];
}

function buildPdfContentStream(lines: string[]): string {
  const commands = ["BT", "/F1 11 Tf", "14 TL", "50 790 Td"];
  lines.forEach((line, index) => {
    if (index > 0) {
      commands.push("T*");
    }
    commands.push(`${pdfLiteralString(line)} Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function pdfLiteralString(value: string): string {
  let result = "(";
  for (const char of normalizePdfText(value)) {
    const code = char.charCodeAt(0);
    if (char === "\\" || char === "(" || char === ")") {
      result += `\\${char}`;
    } else if (code >= 32 && code <= 126) {
      result += char;
    } else if (code <= 255) {
      result += `\\${code.toString(8).padStart(3, "0")}`;
    } else {
      result += "?";
    }
  }
  return `${result})`;
}

function normalizePdfText(value: string): string {
  return value
    .replace(/[“”„]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "*");
}

function buildPdf(objects: string[]): string {
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function encodeAscii(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff;
  }
  return bytes;
}

interface ZipFile {
  name: string;
  data: string;
}

function createZipBlob(files: ZipFile[], mimeType: string): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.data);
    const crc = crc32(dataBytes);
    const localHeader = zipLocalHeader(nameBytes, dataBytes, crc);
    chunks.push(localHeader, dataBytes);
    centralDirectory.push(zipCentralDirectoryHeader(nameBytes, dataBytes, crc, offset));
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  chunks.push(...centralDirectory, zipEndOfCentralDirectory(files.length, centralDirectorySize, centralDirectoryOffset));
  return new Blob(chunks.map(bytesToArrayBuffer), { type: mimeType });
}

function zipLocalHeader(nameBytes: Uint8Array, dataBytes: Uint8Array, crc: number): Uint8Array {
  const header = new Uint8Array(30 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, dataBytes.length, true);
  view.setUint32(22, dataBytes.length, true);
  view.setUint16(26, nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function zipCentralDirectoryHeader(nameBytes: Uint8Array, dataBytes: Uint8Array, crc: number, offset: number): Uint8Array {
  const header = new Uint8Array(46 + nameBytes.length);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, dataBytes.length, true);
  view.setUint32(24, dataBytes.length, true);
  view.setUint16(28, nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function zipEndOfCentralDirectory(fileCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  return header;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ (CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

const CRC32_TABLE = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
