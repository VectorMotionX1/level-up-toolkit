import fs from "node:fs/promises";
import path from "node:path";
import { extractPdfPages } from "../lib/pdf.js";
import { manualPath, rootDir } from "../lib/paths.js";

const groups = [
  ["Scoring Rules", "SC"],
  ["Specific Game Rules", "SG"],
  ["Safety Rules", "S"],
  ["General Rules", "G"],
  ["General Game Rules", "GG"],
  ["Robot Skills Challenge Rules", "RSC"],
  ["Robot Rules", "R"],
  ["Tournament Rules", "T"]
];

function normalize(text) {
  return text.replace(/\s+/g, " ").replace(/Student -centered/g, "Student-centered").trim();
}

function getQuickReferenceText(pages) {
  return normalize(
    pages
      .filter((page) => page.page >= 6 && page.page <= 8)
      .map((page) => page.text)
      .join(" ")
  );
}

function getChangelogText(pages) {
  return normalize(
    pages
      .filter((page) => page.page >= 5 && page.page <= 5)
      .map((page) => page.text)
      .join(" ")
  );
}

function sliceBetween(text, startLabel, endLabel) {
  const start = text.indexOf(startLabel);
  if (start === -1) return "";
  const contentStart = start + startLabel.length;
  const end = endLabel ? text.indexOf(endLabel, contentStart) : -1;
  return text.slice(contentStart, end === -1 ? text.length : end).trim();
}

function parseRules(groupText, prefix, groupLabel) {
  const pattern = new RegExp(`<${prefix}\\d+[A-Z]?>`, "g");
  const matches = [...groupText.matchAll(pattern)];

  return matches.map((match, index) => {
    const ref = match[0].slice(1, -1);
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : groupText.length;
    const title = normalize(groupText.slice(start, end));

    return {
      id: ref,
      ref,
      prefix,
      group: groupLabel,
      title,
      text: title
    };
  });
}

function parseChangelog(text) {
  const start = text.indexOf("Prefix Changelog");
  if (start === -1) return [];

  const changelogText = text.slice(start + "Prefix Changelog".length).trim();
  const versionMatches = [...changelogText.matchAll(/Version\s+[\d.]+\s+-\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}/g)];

  return versionMatches.map((match, index) => {
    const header = match[0];
    const next = index + 1 < versionMatches.length ? versionMatches[index + 1].index : changelogText.length;
    const body = changelogText.slice(match.index + header.length, next).trim();
    const headerMatch = header.match(/Version\s+([\d.]+)\s+-\s+(.+)/);
    const changes = body
      .split(/\s*●\s*/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      version: headerMatch?.[1] || header,
      date: headerMatch?.[2] || "",
      changes: changes.length ? changes : [body || "No details listed."]
    };
  });
}

const pages = await extractPdfPages(manualPath);
const quickReferenceText = getQuickReferenceText(pages);
const changelog = parseChangelog(getChangelogText(pages));

const parsedGroups = groups.map(([label, prefix], index) => {
  const nextLabel = groups[index + 1]?.[0] || null;
  const groupText = sliceBetween(quickReferenceText, label, nextLabel);
  return {
    prefix,
    label,
    rules: parseRules(groupText, prefix, label)
  };
});

const totalRules = parsedGroups.reduce((sum, group) => sum + group.rules.length, 0);
const data = {
  generatedAt: new Date().toISOString(),
  source: "Quick Reference Guide, manual pages vi-viii",
  changelogSource: "Prefix Changelog, manual page v",
  pages: [6, 7, 8],
  totalRules,
  groups: parsedGroups,
  changelog
};

await fs.writeFile(path.join(rootDir, "public", "rules.json"), JSON.stringify(data), "utf8");
console.log(`Extracted ${totalRules} quick-reference rules and ${changelog.length} changelog entries into public/rules.json.`);
