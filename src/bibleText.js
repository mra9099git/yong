import {
  getBibleData,
  getBookByKorean,
  getChaptersInRange,
  enumerateVerses,
  isVerseInRange,
  getChapterVerseCount,
  formatPassage,
} from './bibleUtils.js';
import { loadBibleBook, saveBibleBook } from './storage.js';
import { fetchNltPassage, parseNltHtml } from './nltApi.js';

let useNlt = false;

export function setUseNlt(value) {
  useNlt = value;
}

export function getUseNlt() {
  return useNlt;
}

/** @param {string} text @returns {Record<string, string>} verseNum -> text */
export function parseChapterInput(text) {
  const verses = {};
  const lines = text.split(/\r?\n/);
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current !== null && buffer.length) {
      verses[String(current)] = buffer.join(' ').trim();
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(.+)/);
    if (match) {
      flush();
      current = parseInt(match[1], 10);
      buffer = [match[2]];
    } else if (current !== null) {
      buffer.push(trimmed);
    }
  }
  flush();
  return verses;
}

/** @param {import('./bibleUtils.js').VerseRange} range @param {number} chapter @param {Record<string, string>} bookData */
export function findMissingVerses(range, chapter, bookData) {
  const missing = [];
  const chData = bookData[String(chapter)] || {};
  const startV = chapter === range.startChapter ? range.startVerse : 1;
  const endV = chapter === range.endChapter ? range.endVerse : Object.keys(chData).length;
  const book = getBookByKorean(range.book);
  const expectedMax = book ? getChapterVerseCount(book.id, chapter) : endV;

  for (let v = startV; v <= endV; v++) {
    if (!chData[String(v)]) missing.push(v);
  }

  const hint = expectedMax > 0 ? expectedMax : null;
  return { missing, expectedMax: hint };
}

/** @param {import('./bibleUtils.js').VerseRange} range @param {Record<string, string>} bookData @param {number} chapter */
export function mergeChapterIntoBook(bookData, chapter, verses) {
  const chKey = String(chapter);
  if (!bookData[chKey]) bookData[chKey] = {};
  for (const [vn, text] of Object.entries(verses)) {
    if (text) bookData[chKey][vn] = text;
  }
  return bookData;
}

/** @param {import('./bibleUtils.js').VerseRange} range @param {import('./bibleUtils.js').VerseRange|null} keyRange */
export async function loadPassageText(range, keyRange) {
  if (!range) return { verses: [], missingChapters: [], source: 'local' };

  if (useNlt) {
    const result = await fetchNltPassage(range);
    if (result.ok) {
      const parsed = parseNltHtml(result.html);
      const verses = enumerateVerses(range).map(({ chapter, verse }) => ({
        chapter,
        verse,
        text: parsed.get(`${chapter}:${verse}`) || null,
        highlight: keyRange ? isVerseInRange(keyRange, { chapter, verse }) : false,
      }));
      return { verses, missingChapters: [], source: 'nlt' };
    }
    return { verses: [], missingChapters: [], source: 'nlt', error: result.error };
  }

  const bookData = await loadBibleBook(range.book);
  const verses = [];
  const missingChapters = [];

  for (const { chapter, verse } of enumerateVerses(range)) {
    const text = bookData[String(chapter)]?.[String(verse)] || null;
    verses.push({
      chapter,
      verse,
      text,
      highlight: keyRange ? isVerseInRange(keyRange, { chapter, verse }) : false,
    });
  }

  for (const ch of getChaptersInRange(range)) {
    const chVerses = enumerateVerses({
      ...range,
      startChapter: ch,
      endChapter: ch,
      startVerse: ch === range.startChapter ? range.startVerse : 1,
      endVerse: ch === range.endChapter ? range.endVerse : 999,
    });
    const hasAny = chVerses.some((v) => bookData[String(ch)]?.[String(v.verse)]);
    const hasAll = chVerses.every((v) => bookData[String(ch)]?.[String(v.verse)]);
    if (!hasAll) missingChapters.push(ch);
  }

  return { verses, missingChapters: [...new Set(missingChapters)], source: 'local', bookData };
}

/** @param {import('./bibleUtils.js').VerseRange} range @param {number} chapter @param {string} inputText */
export async function saveChapterInput(range, chapter, inputText) {
  const verses = parseChapterInput(inputText);
  let bookData = await loadBibleBook(range.book);
  bookData = mergeChapterIntoBook(bookData, chapter, verses);
  await saveBibleBook(range.book, bookData);
  const { missing } = findMissingVerses(range, chapter, bookData);
  return { bookData, savedVerses: Object.keys(verses).map(Number), missing };
}

/** 모달 프리필용: 저장된 장을 `N 본문` 줄로 */
export function formatChapterForInput(bookData, chapter, range) {
  const ch = bookData?.[String(chapter)] || {};
  const startV = range && chapter === range.startChapter ? range.startVerse : 1;
  const keys = Object.keys(ch)
    .map(Number)
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const endV =
    range && chapter === range.endChapter
      ? range.endVerse
      : keys.length
        ? Math.max(...keys)
        : startV;
  const lines = [];
  for (let v = startV; v <= endV; v++) {
    const text = ch[String(v)];
    if (text) lines.push(`${v} ${text}`);
  }
  return lines.join('\n');
}

export async function loadChapterInputText(range, chapter) {
  const bookData = await loadBibleBook(range.book);
  return formatChapterForInput(bookData, chapter, range);
}

/** @param {import('./bibleUtils.js').VerseRange} range */
export function renderPassageHtml(verses, missingChapters) {
  if (!verses.length) {
    return '<p class="bible-empty">구절을 선택해 주세요.</p>';
  }

  let html = '';
  let lastChapter = null;

  for (const v of verses) {
    if (v.chapter !== lastChapter) {
      if (lastChapter !== null) html += '</div>';
      html += `<div class="bible-chapter"><h3 class="bible-chapter-title">${v.chapter}장</h3>`;
      lastChapter = v.chapter;
    }
    const cls = v.highlight ? 'bible-verse key-verse' : 'bible-verse';
    const text = v.text
      ? `<span class="verse-text">${escapeHtml(v.text)}</span>`
      : '<span class="verse-missing">[본문 없음]</span>';
    html += `<p class="${cls}"><sup>${v.verse}</sup> ${text}</p>`;
  }
  if (lastChapter !== null) html += '</div>';

  if (missingChapters.length && !useNlt) {
    html += `<p class="bible-missing-hint">입력이 필요한 장: ${missingChapters.join(', ')}장</p>`;
  }

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { getBibleData, formatPassage };
