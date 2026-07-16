import bibleDataImport from './bibleData.js';

let bibleData = bibleDataImport;

export async function loadBibleData() {
  if (!bibleData.books?.length) {
    throw new Error('bibleData에 책 목록이 없습니다');
  }
  return bibleData;
}

export function getBibleData() {
  return bibleData;
}

/** 데이터 루트(OneDrive\0VibeCoding\일용할양식) 기준 상대 경로 */
export const RECORDS_DIR = '양식';
export const BIBLE_DIR = '성경/개역개정';

export function getBookByKorean(name) {
  return bibleData.books.find((b) => b.korean === name);
}

export function getBookById(id) {
  return bibleData.books.find((b) => b.id === id);
}

/** @typedef {{ book: string, startChapter: number, startVerse: number, endChapter: number, endVerse: number }} VerseRange */

/** @returns {VerseRange|null} */
export function parsePassageString(str) {
  if (!str || !str.trim()) return null;
  const match = str.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$/);
  if (!match) return null;
  const book = match[1].trim();
  const startChapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  let endChapter = startChapter;
  let endVerse;
  if (match[5]) {
    endChapter = parseInt(match[4], 10);
    endVerse = parseInt(match[5], 10);
  } else if (match[4]) {
    endVerse = parseInt(match[4], 10);
  } else {
    endVerse = startVerse;
  }
  return { book, startChapter, startVerse, endChapter, endVerse };
}

/** @param {VerseRange} range */
export function formatPassage(range) {
  if (!range) return '';
  const { book, startChapter, startVerse, endChapter, endVerse } = range;
  if (startChapter === endChapter) {
    if (startVerse === endVerse) return `${book} ${startChapter}:${startVerse}`;
    return `${book} ${startChapter}:${startVerse}-${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}-${endChapter}:${endVerse}`;
}

/** @param {VerseRange} keyRange @param {VerseRange} passageRange */
export function formatKeyVerseLabel(keyRange, passageRange) {
  if (!keyRange) return '';
  if (
    keyRange.startChapter === keyRange.endChapter &&
    passageRange &&
    keyRange.startChapter === passageRange.startChapter &&
    passageRange.startChapter === passageRange.endChapter
  ) {
    if (keyRange.startVerse === keyRange.endVerse) return `${keyRange.startVerse}`;
    return `${keyRange.startVerse}-${keyRange.endVerse}`;
  }
  if (keyRange.startChapter === keyRange.endChapter) {
    if (keyRange.startVerse === keyRange.endVerse) {
      return `${keyRange.startChapter}:${keyRange.startVerse}`;
    }
    return `${keyRange.startChapter}:${keyRange.startVerse}-${keyRange.endVerse}`;
  }
  return formatPassage(keyRange).replace(/^[^ ]+ /, '');
}

/** @param {VerseRange} range */
export function enumerateVerses(range) {
  const verses = [];
  for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
    const startV = ch === range.startChapter ? range.startVerse : 1;
    const book = getBookByKorean(range.book);
    const maxV = book ? (book.chapters[ch - 1] || 999) : 999;
    const endV = ch === range.endChapter ? range.endVerse : maxV;
    for (let v = startV; v <= endV; v++) {
      verses.push({ chapter: ch, verse: v });
    }
  }
  return verses;
}

/** @param {VerseRange} range @param {{ chapter: number, verse: number }} point */
export function isVerseInRange(range, point) {
  if (!range) return false;
  const n = point.chapter * 100000 + point.verse;
  const s = range.startChapter * 100000 + range.startVerse;
  const e = range.endChapter * 100000 + range.endVerse;
  return n >= s && n <= e;
}

/** @param {number} bookId @param {number} chapter */
export function getChapterVerseCount(bookId, chapter) {
  const book = getBookById(bookId);
  if (!book) return 0;
  return book.chapters[chapter - 1] || 0;
}

/** @param {VerseRange} range */
export function getChaptersInRange(range) {
  const chapters = [];
  for (let ch = range.startChapter; ch <= range.endChapter; ch++) {
    chapters.push(ch);
  }
  return chapters;
}
