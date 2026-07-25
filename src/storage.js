import { getFs, invoke } from './tauriApi.js';
import { RECORDS_DIR, BIBLE_DIR } from './bibleUtils.js';

const { exists, readTextFile, writeTextFile, readDir, remove, mkdir, rename } = getFs();

/** @type {Promise<string>|null} */
let dataRootPromise = null;

/** OneDrive\0VibeCoding\DailyBread\데이터 절대 경로 */
export function getDataRoot() {
  if (!dataRootPromise) {
    dataRootPromise = invoke('get_data_root');
  }
  return dataRootPromise;
}

function joinPath(root, rel) {
  const base = String(root).replace(/[/\\]+$/, '');
  const rest = String(rel).replace(/^[/\\]+/, '').replace(/\\/g, '/');
  return `${base}/${rest}`;
}

async function abs(rel) {
  return joinPath(await getDataRoot(), rel);
}

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

async function recordPath(dateStr) {
  const year = dateStr.slice(0, 4);
  return abs(`${RECORDS_DIR}/${year}/${dateStr}.md`);
}

async function biblePath(bookName) {
  return abs(`${BIBLE_DIR}/${bookName}.json`);
}

export async function ensureDataDirs() {
  const year = new Date().getFullYear().toString();
  for (const dir of [`${RECORDS_DIR}/${year}`, BIBLE_DIR]) {
    const path = await abs(dir);
    const ok = await exists(path);
    if (!ok) await mkdir(path, { recursive: true });
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
  const path = await recordPath(dateStr);
  const ok = await exists(path);
  if (!ok) return null;
  const content = await readTextFile(path);
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
  const path = await recordPath(data.date);
  const yearDir = await abs(`${RECORDS_DIR}/${data.date.slice(0, 4)}`);
  const dirOk = await exists(yearDir);
  if (!dirOk) await mkdir(yearDir, { recursive: true });
  await writeTextFile(path, serializeMarkdown(data));
}

export async function deleteRecord(dateStr) {
  const path = await recordPath(dateStr);
  const ok = await exists(path);
  if (ok) await remove(path);
}

async function collectMdFiles(dir, files = []) {
  const ok = await exists(dir);
  if (!ok) return files;
  const entries = await readDir(dir);
  for (const entry of entries) {
    const sub = joinPath(dir, entry.name);
    if (entry.isDirectory) {
      await collectMdFiles(sub, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(sub);
    }
  }
  return files;
}

export async function listAllRecords() {
  const recordsDir = await abs(RECORDS_DIR);
  const files = await collectMdFiles(recordsDir);
  const records = [];
  for (const file of files) {
    try {
      const content = await readTextFile(file);
      const parsed = parseMarkdown(content);
      const name = file.split(/[/\\]/).pop().replace('.md', '');
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
  const path = await biblePath(bookName);
  const ok = await exists(path);
  if (!ok) return {};
  const content = await readTextFile(path);
  return JSON.parse(content);
}

export async function saveBibleBook(bookName, data) {
  const path = await biblePath(bookName);
  const tmpPath = `${path}.tmp`;
  const bibleDir = await abs(BIBLE_DIR);
  const dirOk = await exists(bibleDir);
  if (!dirOk) await mkdir(bibleDir, { recursive: true });
  const json = JSON.stringify(data, null, 2);
  await writeTextFile(tmpPath, json);
  const targetExists = await exists(path);
  if (targetExists) await remove(path);
  await rename(tmpPath, path);
}

export async function getRecordDates() {
  const records = await listAllRecords();
  return new Set(records.map((r) => r.date));
}
