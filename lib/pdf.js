import fs from "node:fs/promises";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

export async function extractPdfPages(filePath) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const document = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = normalizeText(content.items.map((item) => item.str).join(" "));

    if (text) {
      pages.push({ page: pageNumber, text });
    }
  }

  return pages;
}

export function chunkPages(pages, { maxChars = 1800, overlapChars = 250 } = {}) {
  const chunks = [];

  for (const page of pages) {
    const paragraphs = page.text
      .split(/(?<=[.!?])\s+(?=[A-Z<])/)
      .map((part) => part.trim())
      .filter(Boolean);

    let buffer = "";
    let chunkOnPage = 1;

    for (const paragraph of paragraphs.length ? paragraphs : [page.text]) {
      if (buffer && `${buffer} ${paragraph}`.length > maxChars) {
        chunks.push({
          id: `p${page.page}-${chunkOnPage}`,
          page: page.page,
          text: buffer
        });
        chunkOnPage += 1;
        buffer = buffer.slice(Math.max(0, buffer.length - overlapChars));
      }

      buffer = buffer ? `${buffer} ${paragraph}` : paragraph;
    }

    if (buffer) {
      chunks.push({
        id: `p${page.page}-${chunkOnPage}`,
        page: page.page,
        text: buffer
      });
    }
  }

  return chunks;
}

function stripPageBoilerplate(text) {
  return text
    .replace(/Copyright 2026,? Innovation First, Inc\.\/ Vex Robotics, Inc\./gi, " ")
    .replace(/Copyright 2026,? VEX Robotics, Inc\./gi, " ")
    .replace(/VEX IQ Robotics Competition Level Up - Game Manual/gi, " ")
    .replace(/Version 0\.1\.2 - Released May 14, 2026/gi, " ")
    .replace(/Unauthorized copying, reproduction, adaptation, or use[\s\S]*?responsible person\(s\)\./gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chunkRules(pages, { maxChars = 2400 } = {}) {
  const chunks = [];

  for (const page of pages) {
    const text = stripPageBoilerplate(page.text);
    if (!text) {
      continue;
    }

    const ruleMatches = [...text.matchAll(/<\s*[A-Z]{1,4}\d+[A-Z]?\s*>/g)];

    if (!ruleMatches.length) {
      for (const chunk of chunkPages([{ page: page.page, text }], { maxChars })) {
        chunks.push(chunk);
      }
      continue;
    }

    const leadIn = text.slice(0, ruleMatches[0].index).trim();
    if (leadIn.length > 120) {
      chunks.push({
        id: `p${page.page}-intro`,
        page: page.page,
        text: leadIn
      });
    }

    for (let i = 0; i < ruleMatches.length; i += 1) {
      const start = ruleMatches[i].index;
      const end = i + 1 < ruleMatches.length ? ruleMatches[i + 1].index : text.length;
      const ruleText = text.slice(start, end).trim();
      if (!ruleText) {
        continue;
      }

      if (ruleText.length <= maxChars) {
        chunks.push({
          id: `p${page.page}-${ruleMatches[i][0].replace(/[<>\s]/g, "").toLowerCase()}`,
          page: page.page,
          text: ruleText
        });
      } else {
        const subchunks = chunkPages([{ page: page.page, text: ruleText }], { maxChars });
        chunks.push(...subchunks);
      }
    }
  }

  return chunks;
}
