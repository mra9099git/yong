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

/** 탭·중복·붙은 적용/한마디 라벨 정리 */
export function normalizePasteText(text) {
  let t = String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n');

  // 절 줄(1\t본문)은 공백으로 — 탭을 줄바꿈으로 바꾸면 절이 깨짐
  t = t.replace(/(^|\n)(\d+)\t+/g, '$1$2 ');
  // 나머지 탭은 표 칸 구분 → 줄바꿈
  t = t.replace(/\t+/g, '\n');

  // 적용/한마디가 본문에 붙어 있으면 줄로 분리
  t = t.replace(/적용(?!\s*\n)/g, '\n적용\n');
  t = t.replace(/한마디(?!\s*\n)/g, '\n한마디\n');

  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

/** 같은 문단이 표 때문에 여러 번 들어온 경우 한 번만 남김 */
export function dedupeRepeatedParagraphs(text) {
  const paras = String(text || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [];
  const seenLong = new Set();

  for (const p of paras) {
    if (p === '적용' || p === '한마디') {
      if (out[out.length - 1] === p) continue;
      // 이미 같은 라벨이 있었으면(표 중복) 이후 반복 블록은 버림
      if (out.includes(p)) break;
      out.push(p);
      continue;
    }
    if (out[out.length - 1] === p) continue;
    if (p.length >= 40) {
      if (seenLong.has(p)) continue;
      seenLong.add(p);
    }
    out.push(p);
  }

  return out.join('\n');
}

/** 첫 번째 섹션만 남기고 라벨 반복 이후는 절단 */
function takeUntilLabel(text, labels) {
  let out = text;
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)${label}(?:\\n|$)`);
    const m = out.search(re);
    if (m >= 0) out = out.slice(0, m);
  }
  return out.trim();
}

/** 클립보드에서 표 중복 없이 텍스트 추출 (본문말씀 plain 우선) */
export function stripClipboardToText(clipboardData) {
  const plain = normalizePasteText(clipboardData?.getData?.('text/plain') || '');

  if (/본문말씀\s*\)/.test(plain)) {
    return dedupeRepeatedParagraphs(plain);
  }

  const html = clipboardData?.getData?.('text/html');
  if (html && html.trim()) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style').forEach((el) => el.remove());
      doc.querySelectorAll('table').forEach((table) => {
        const seen = new Set();
        const parts = [];
        table.querySelectorAll('td, th').forEach((cell) => {
          const cellText = cell.textContent.replace(/\s+/g, ' ').trim();
          if (!cellText || seen.has(cellText)) return;
          seen.add(cellText);
          parts.push(cellText);
        });
        table.replaceWith(doc.createTextNode(`${parts.join('\n')}\n`));
      });
      const fromHtml = normalizePasteText(doc.body?.innerText || '');
      if (fromHtml) return dedupeRepeatedParagraphs(fromHtml);
    } catch {
      /* fall through */
    }
  }

  return dedupeRepeatedParagraphs(plain);
}

/**
 * 해설 / 적용 / 한마디 분리
 * @param {string} rest
 */
function splitInterpretationSections(rest) {
  let text = dedupeRepeatedParagraphs(normalizePasteText(rest));

  text = text
    .replace(/(^|\n)적용(\n|$)/g, '\n적용\n')
    .replace(/(^|\n)한마디(\n|$)/g, '\n한마디\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const applyPos = text.search(/(?:^|\n)적용\n/);
  const onePos = text.search(/(?:^|\n)한마디\n/);

  let commentary = text;
  let application = '';
  let oneLiner = '';

  if (applyPos >= 0 && onePos >= 0) {
    if (applyPos < onePos) {
      commentary = text.slice(0, applyPos).trim();
      application = takeUntilLabel(
        text.slice(applyPos).replace(/^(?:\n)?적용\n?/, ''),
        ['한마디', '적용'],
      );
      oneLiner = takeUntilLabel(
        text.slice(onePos).replace(/^(?:\n)?한마디\n?/, ''),
        ['적용', '한마디'],
      );
    } else {
      commentary = text.slice(0, onePos).trim();
      oneLiner = takeUntilLabel(
        text.slice(onePos).replace(/^(?:\n)?한마디\n?/, ''),
        ['적용', '한마디'],
      );
      application = takeUntilLabel(
        text.slice(applyPos).replace(/^(?:\n)?적용\n?/, ''),
        ['한마디', '적용'],
      );
    }
  } else if (applyPos >= 0) {
    commentary = text.slice(0, applyPos).trim();
    application = takeUntilLabel(
      text.slice(applyPos).replace(/^(?:\n)?적용\n?/, ''),
      ['적용', '한마디'],
    );
  } else if (onePos >= 0) {
    commentary = text.slice(0, onePos).trim();
    oneLiner = takeUntilLabel(
      text.slice(onePos).replace(/^(?:\n)?한마디\n?/, ''),
      ['적용', '한마디'],
    );
  }

  commentary = dedupeRepeatedParagraphs(commentary);
  application = dedupeRepeatedParagraphs(application);
  oneLiner = dedupeRepeatedParagraphs(oneLiner);

  application = application.replace(/^적용\n?/, '').trim();
  oneLiner = oneLiner.replace(/^한마디\n?/, '').trim();

  return { commentary, application, oneLiner };
}

/**
 * 일용할 양식 붙여넣기 형식 파싱
 * @param {string} text
 * @returns {PasteParseResult}
 */
export function parseDailyBreadPaste(text) {
  const raw = dedupeRepeatedParagraphs(normalizePasteText(text));
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
    if (trimmed === '적용' || trimmed === '한마디') break;
    if (/^적용\S/.test(trimmed) || /^한마디\S/.test(trimmed)) break;
    if (/^\d+\s+\S/.test(trimmed)) {
      verseLines.push(trimmed);
      i += 1;
      continue;
    }
    // 절을 모으다 해설이 나오면 종료 / 절이 없는데 긴 글이면 해설로
    if (verseLines.length || trimmed.length > 30) break;
    i += 1;
  }

  const rest = lines.slice(i).join('\n');
  const { commentary, application, oneLiner } = splitInterpretationSections(rest);

  const chapterInputs = {};
  if (verseLines.length) {
    const seenVerse = new Set();
    const uniqueVerses = [];
    for (const line of verseLines) {
      const m = line.match(/^(\d+)\s+/);
      const key = m ? m[1] : line;
      if (seenVerse.has(key)) continue;
      seenVerse.add(key);
      uniqueVerses.push(line);
    }
    chapterInputs[startChapter] = uniqueVerses.join('\n');
  }

  const parts = [];
  if (commentary) parts.push(commentary);
  if (application) parts.push(`**적용**\n\n${application}`);
  if (oneLiner) parts.push(`**한마디**\n\n${oneLiner}`);

  return {
    recognized: true,
    passage,
    keyVerse,
    chapterInputs,
    interpretationMd: parts.join('\n\n'),
  };
}
