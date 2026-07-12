import { getFs } from './tauriApi.js';
import { RECORDS_DIR, BIBLE_DIR } from './bibleUtils.js';

const { exists, readTextFile, writeTextFile, readDir, remove, mkdir, rename, BaseDirectory } =
  getFs();

const BASE = { baseDir: BaseDirectory.Document };

export function formatDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function recordPath(dateStr) {
  const year = dateStr.slice(0, 4);
  return `${RECORDS_DIR}/${year}/${dateStr}.md`;
}

function biblePath(bookName) {
  return `${BIBLE_DIR}/${bookName}.json`;
}

export async function ensureDataDirs() {
  const year = new Date().getFullYear().toString();
  for (const dir of [`${RECORDS_DIR}/${year}`, BIBLE_DIR]) {
    const ok = await exists(dir, BASE);
    if (!ok) await mkdir(dir, { ...BASE, recursive: true });
  }
}

export function parseMarkdown(content) {
  const result = {
    date: '',
    passage: '',
    key_verse: '',
    book: '',
    interpretation: '',
    meditation: '',
  };

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch) {
    result.meditation = content.trim();
    return result;
  }

  fmMatch[1].split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key in result) result[key] = val;
  });

  const body = fmMatch[2];
  const interpMatch = body.match(/##\s*해석\r?\n([\s\S]*?)(?=##\s*나의 묵상|$)/);
  const medMatch = body.match(/##\s*나의 묵상\r?\n([\s\S]*)$/);
  result.interpretation = interpMatch ? interpMatch[1].trimEnd() : '';
  result.meditation = medMatch ? medMatch[1].trimEnd() : '';
  return result;
}

export function serializeMarkdown(data) {
  const fm = [
    '---',
    `date: ${data.date}`,
    `passage: ${data.passage || ''}`,
    `key_verse: ${data.key_verse || ''}`,
    `book: ${data.book || ''}`,
    '---',
    '',
    '## 해석',
    data.interpretation || '',
    '',
    '## 나의 묵상',
    data.meditation || '',
    '',
  ].join('\n');
  return fm;
}

export async function loadRecord(dateStr) {
  const path = recordPath(dateStr);
  const ok = await exists(path, BASE);
  if (!ok) return null;
  const content = await readTextFile(path, BASE);
  const parsed = parseMarkdown(content);
  parsed.date = parsed.date || dateStr;
  return parsed;
}

export function recordHasContent(data) {
  return !!(
    data.passage?.trim() ||
    data.interpretation?.trim() ||
    data.meditation?.trim()
  );
}

export async function saveRecord(data) {
  const path = recordPath(data.date);
  const yearDir = `${RECORDS_DIR}/${data.date.slice(0, 4)}`;
  const dirOk = await exists(yearDir, BASE);
  if (!dirOk) await mkdir(yearDir, { ...BASE, recursive: true });
  await writeTextFile(path, serializeMarkdown(data), BASE);
}

export async function deleteRecord(dateStr) {
  const path = recordPath(dateStr);
  const ok = await exists(path, BASE);
  if (ok) await remove(path, BASE);
}

async function collectMdFiles(dir, files = []) {
  const ok = await exists(dir, BASE);
  if (!ok) return files;
  const entries = await readDir(dir, BASE);
  for (const entry of entries) {
    const sub = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      await collectMdFiles(sub, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(sub);
    }
  }
  return files;
}

export async function listAllRecords() {
  const files = await collectMdFiles(RECORDS_DIR);
  const records = [];
  for (const file of files) {
    try {
      const content = await readTextFile(file, BASE);
      const parsed = parseMarkdown(content);
      const name = file.split('/').pop().replace('.md', '');
      parsed.date = parsed.date || name;
      if (recordHasContent(parsed)) records.push(parsed);
    } catch {
      /* skip unreadable */
    }
  }
  records.sort((a, b) => b.date.localeCompare(a.date));
  return records;
}

export async function loadBibleBook(bookName) {
  const path = biblePath(bookName);
  const ok = await exists(path, BASE);
  if (!ok) return {};
  const content = await readTextFile(path, BASE);
  return JSON.parse(content);
}

export async function saveBibleBook(bookName, data) {
  const path = biblePath(bookName);
  const tmpPath = `${path}.tmp`;
  const dirOk = await exists(BIBLE_DIR, BASE);
  if (!dirOk) await mkdir(BIBLE_DIR, { ...BASE, recursive: true });
  const json = JSON.stringify(data, null, 2);
  await writeTextFile(tmpPath, json, BASE);
  const targetExists = await exists(path, BASE);
  if (targetExists) await remove(path, BASE);
  await rename(tmpPath, path, {
    fromPathBaseDir: BaseDirectory.Document,
    toPathBaseDir: BaseDirectory.Document,
  });
}

export async function getRecordDates() {
  const records = await listAllRecords();
  return new Set(records.map((r) => r.date));
}
