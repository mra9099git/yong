import { getBibleData, getBookByKorean } from './bibleUtils.js';

/**
 * @typedef {import('./bibleUtils.js').VerseRange} VerseRange
 * @typedef {{
 *   recognized: boolean,
 *   passage?: VerseRange,
 *   keyVerse?: VerseRange|null,
 *   chapterInputs?: Record<number, string>,
 *   interpretationMd?: string,
 * }} PasteParseResult
 */

/** 책 이름 해석 (부분 일치 허용: 마태 → 마태복음) */
export function resolveBookName(query) {
  const raw = (query || '').trim();
  if (!raw) return null;
  const books = getBibleData().books;
  const exact = books.find(
    (b) => b.korean === raw || b.english.toLowerCase() === raw.toLowerCase(),
  );
  if (exact) return exact;

  const q = raw.toLowerCase();
  const matches = books.filter(
    (b) =>
      b.korean.startsWith(raw) ||
      b.korean.includes(raw) ||
      b.english.toLowerCase().startsWith(q) ||
      b.english.toLowerCase().includes(q),
  );
  if (!matches.length) return null;
  matches.sort((a, b) => a.korean.length - b.korean.length);
  return matches[0];
}

/** 클립보드에서 표 제거 후 일반 텍스트 추출 */
export function stripClipboardToText(clipboardData) {
  const html = clipboardData?.getData?.('text/html');
  if (html && html.trim()) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style').forEach((el) => el.remove());
      doc.querySelectorAll('table').forEach((table) => {
        const lines = [...table.querySelectorAll('tr')]
          .map((tr) =>
            [...tr.querySelectorAll('th, td')]
              .map((c) => c.textContent.replace(/\s+/g, ' ').trim())
              .filter(Boolean)
              .join('\t'),
          )
          .filter(Boolean);
        table.replaceWith(doc.createTextNode(`${lines.join('\n')}\n`));
      });
      return (doc.body?.innerText || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\r\n/g, '\n');
    } catch {
      /* fall through */
    }
  }
  return (clipboardData?.getData?.('text/plain') || '').replace(/\r\n/g, '\n');
}

/**
 * 일용할 양식 붙여넣기 형식 파싱
 * @param {string} text
 * @returns {PasteParseResult}
 */
export function parseDailyBreadPaste(text) {
  const raw = (text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return { recognized: false };

  const headerRe =
    /본문말씀\s*\)\s*(.+?)\s+(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?(?:\s*\((\d+(?:\s*-\s*\d+)?)\))?/;
  const hm = raw.match(headerRe);
  if (!hm) return { recognized: false };

  const bookQuery = hm[1].trim();
  const bookObj = resolveBookName(bookQuery) || getBookByKorean(bookQuery);
  if (!bookObj) return { recognized: false };

  const book = bookObj.korean;
  const startChapter = parseInt(hm[2], 10);
  const startVerse = parseInt(hm[3], 10);
  let endChapter = startChapter;
  let endVerse = startVerse;
  if (hm[5]) {
    endChapter = parseInt(hm[4], 10);
    endVerse = parseInt(hm[5], 10);
  } else if (hm[4]) {
    endVerse = parseInt(hm[4], 10);
  }

  /** @type {VerseRange} */
  const passage = { book, startChapter, startVerse, endChapter, endVerse };

  let keyVerse = null;
  if (hm[6]) {
    const keyPart = hm[6].replace(/\s+/g, '');
    const keyRange = keyPart.match(/^(\d+)-(\d+)$/);
    const keySingle = keyPart.match(/^(\d+)$/);
    if (keyRange) {
      keyVerse = {
        book,
        startChapter,
        startVerse: parseInt(keyRange[1], 10),
        endChapter: startChapter,
        endVerse: parseInt(keyRange[2], 10),
      };
    } else if (keySingle) {
      const v = parseInt(keySingle[1], 10);
      keyVerse = {
        book,
        startChapter,
        startVerse: v,
        endChapter: startChapter,
        endVerse: v,
      };
    }
  }

  const afterHeader = raw.slice(hm.index + hm[0].length).replace(/^\n+/, '');
  const lines = afterHeader.split('\n');

  const verseLines = [];
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (verseLines.length) break;
      i += 1;
      continue;
    }
    if (/^적용\s*$/.test(trimmed) || /^한마디\s*$/.test(trimmed)) break;
    if (/^\d+\s+\S/.test(trimmed)) {
      verseLines.push(trimmed);
      i += 1;
      continue;
    }
    if (verseLines.length) break;
    i += 1;
  }

  const restLines = lines.slice(i);
  let applyIdx = -1;
  let oneIdx = -1;
  for (let j = 0; j < restLines.length; j++) {
    const t = restLines[j].trim();
    if (applyIdx < 0 && /^적용\s*$/.test(t)) applyIdx = j;
    if (oneIdx < 0 && /^한마디\s*$/.test(t)) oneIdx = j;
  }

  let commentary = '';
  let application = '';
  let oneLiner = '';

  if (applyIdx >= 0 && oneIdx >= 0) {
    const first = Math.min(applyIdx, oneIdx);
    const second = Math.max(applyIdx, oneIdx);
    commentary = restLines.slice(0, first).join('\n').trim();
    if (applyIdx < oneIdx) {
      application = restLines.slice(applyIdx + 1, oneIdx).join('\n').trim();
      oneLiner = restLines.slice(oneIdx + 1).join('\n').trim();
    } else {
      oneLiner = restLines.slice(oneIdx + 1, applyIdx).join('\n').trim();
      application = restLines.slice(applyIdx + 1).join('\n').trim();
    }
  } else if (applyIdx >= 0) {
    commentary = restLines.slice(0, applyIdx).join('\n').trim();
    application = restLines.slice(applyIdx + 1).join('\n').trim();
  } else if (oneIdx >= 0) {
    commentary = restLines.slice(0, oneIdx).join('\n').trim();
    oneLiner = restLines.slice(oneIdx + 1).join('\n').trim();
  } else {
    commentary = restLines.join('\n').trim();
  }

  const chapterInputs = {};
  if (verseLines.length) {
    // 단일 장 붙여넣기가 일반적 — 시작 장에 모음
    chapterInputs[startChapter] = verseLines.join('\n');
  }

  const parts = [];
  if (commentary) parts.push(commentary);
  if (application) parts.push(`**적용**\n${application}`);
  if (oneLiner) parts.push(`**한마디**\n${oneLiner}`);

  return {
    recognized: true,
    passage,
    keyVerse,
    chapterInputs,
    interpretationMd: parts.join('\n\n'),
  };
}
