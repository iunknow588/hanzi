#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(WORKSPACE_ROOT, 'packages', 'hanzi-writer-data', 'data');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`Usage: yarn subset <chars> [--out subset.json] [--list path]

Examples:
  yarn subset 我你汉
  yarn subset 我 你 汉 --out ./apps/hanzi-demo/src/local-data.json
  yarn subset --list ./presets/hsk1.txt --out ./apps/hanzi-demo/src/local-data.json
`);
  process.exit(0);
}

let outFile = null;
let listFile = null;
const filteredArgs = [];
for (let i = 0; i < args.length; i++) {
  const val = args[i];
  if (val === '--out') {
    outFile = args[i + 1];
    i++;
  } else if (val === '--list') {
    listFile = args[i + 1];
    i++;
  } else {
    filteredArgs.push(val);
  }
}

const readListFile = async (filePath) => {
  const abs = path.resolve(process.cwd(), filePath);
  const content = await readFile(abs, 'utf-8');
  return content
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .join('');
};

const aggregatedChars = async () => {
  if (listFile) {
    return readListFile(listFile);
  }
  return filteredArgs.join('');
};

const chars = await aggregatedChars().then((str) => str.split('').filter(Boolean));
if (chars.length === 0) {
  console.error('No characters provided (pass inline chars or --list)');
  process.exit(1);
}

const loadChar = async (char) => {
  const filePath = path.join(DATA_DIR, `${char}.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Missing data file for ${char} (${filePath})`);
  }
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
};

const main = async () => {
  const subset = {};
  for (const char of chars) {
    subset[char] = await loadChar(char);
  }

  const output = JSON.stringify(subset, null, 2);
  if (!outFile) {
    console.log(output);
    return;
  }
  const outPath = path.resolve(process.cwd(), outFile);
  const dir = path.dirname(outPath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(outPath, output, 'utf-8');
  console.log(`Subset written to ${outPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
